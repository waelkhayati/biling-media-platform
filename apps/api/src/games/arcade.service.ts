import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { StaffIdentity } from "@biling/contracts";
import {
  arcadeDefinitionSchema,
  arcadeProgressSchema,
  arcadeViewSchema,
  type ArcadeAction,
  type ArcadePuzzleInput,
} from "@biling/schemas";
import type { ArcadePuzzle, ArcadeRun } from "../generated/prisma/client";
import { writeStudioChange } from "../admin/studio-write";
import { PrismaService } from "../database/prisma.service";
import { initialProgress, play, won } from "./arcade-rules";
function summary({ slug, title, description, date, kind }: ArcadePuzzle) {
  return { slug, title, description, date, kind };
}
const day = (now: Date) => now.toISOString().slice(0, 10);
const midnight = (now: Date) => Date.parse(day(now) + "T00:00:00Z") + 86_400_000;
const tileToken = (puzzleId: string, id: string) =>
  createHash("sha256")
    .update(puzzleId + ":" + id)
    .digest("hex");
function view(puzzle: ArcadePuzzle, run: ArcadeRun | null, now = new Date()) {
  const game = arcadeDefinitionSchema.parse(puzzle.definition);
  const progress = run && arcadeProgressSchema.parse(run.progress);
  const finished = !!progress && progress.status !== "IN_PROGRESS";
  const { words, mistakes, feedback, revision, status } = progress ?? initialProgress();
  const tiles =
    game.kind === "LINKS"
      ? game.groups.flatMap((group, index) => (progress?.solved.includes(index) ? [] : group.tiles))
      : [];
  const publicTile = (tile: { id: string; label: string }) => ({
    id: tileToken(puzzle.id, tile.id),
    label: tile.label,
  });
  return arcadeViewSchema.parse({
    ...summary(puzzle),
    deadline: run?.deadline.toISOString() ?? null,
    serverNow: now.toISOString(),
    progress: progress && { words, mistakes, feedback, revision, status },
    limit:
      game.kind === "MOT" ? game.guesses : game.kind === "LINKS" ? game.mistakes : game.duration,
    wordLength: game.kind === "MOT" ? game.solution.length : null,
    tiles: finished ? [] : tiles.map(publicTile).sort((a, b) => a.id.localeCompare(b.id)),
    groups:
      game.kind === "LINKS"
        ? game.groups.flatMap((group, index) => {
            const solved = progress?.solved.includes(index) ?? false;
            return solved || finished
              ? [{ title: group.title, tiles: group.tiles.map(publicTile), solved }]
              : [];
          })
        : [],
    slots:
      game.kind === "RECALL"
        ? game.answers.map((item, index) => {
            const found = progress?.found.includes(index) ?? false;
            return { found, label: found || finished ? item.label : null };
          })
        : [],
    solution: finished && game.kind === "MOT" ? game.solution : null,
    won: !!progress && won(game, progress),
  });
}
@Injectable()
export class ArcadeService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async list(userId?: string) {
    const items = await this.db.arcadePuzzle.findMany({
      where: { date: day(new Date()), published: true },
      orderBy: { slug: "asc" },
    });
    if (!userId || !items.length) return items.map(summary);
    const runs = await this.db.arcadeRun.findMany({
      where: { userId, puzzleId: { in: items.map((item) => item.id) } },
    });
    const activity = new Map(
      runs.map((run) => {
        const { status } = arcadeProgressSchema.parse(run.progress);
        return [
          run.puzzleId,
          status === "IN_PROGRESS" && run.deadline.getTime() <= Date.now() ? "EXPIRED" : status,
        ];
      }),
    );
    return items.map((item) => ({ ...summary(item), activity: activity.get(item.id) }));
  }
  private async puzzle(slug: string, date: string) {
    const puzzle = await this.db.arcadePuzzle.findUnique({ where: { slug_date: { slug, date } } });
    if (!puzzle?.published || date > day(new Date()))
      throw new NotFoundException("Puzzle unavailable.");
    return puzzle;
  }
  async read(slug: string, date: string, userId?: string) {
    const puzzle = await this.puzzle(slug, date);
    if (!userId) return view(puzzle, null);
    const key = { puzzleId: puzzle.id, userId };
    const run = await this.db.arcadeRun.findUnique({ where: { puzzleId_userId: key } });
    return view(puzzle, run && (await this.expire(run)));
  }
  private async expire(run: ArcadeRun) {
    const progress = arcadeProgressSchema.parse(run.progress);
    if (progress.status !== "IN_PROGRESS" || run.deadline.getTime() > Date.now()) return run;
    const expired = {
      ...progress,
      status: "EXPIRED" as const,
      revision: run.revision + 1,
      feedback: null,
    };
    const updated = await this.db.arcadeRun.updateMany({
      where: { id: run.id, revision: run.revision },
      data: { progress: expired, revision: expired.revision },
    });
    if (updated.count) return { ...run, progress: expired, revision: expired.revision };
    return this.db.arcadeRun.findUniqueOrThrow({ where: { id: run.id } });
  }
  async start(slug: string, date: string, userId: string) {
    const puzzle = await this.puzzle(slug, date);
    const now = new Date();
    const key = { puzzleId: puzzle.id, userId };
    const existing = await this.db.arcadeRun.findUnique({ where: { puzzleId_userId: key } });
    if (existing) return view(puzzle, await this.expire(existing));
    if (date !== day(now)) throw new ConflictException("This daily puzzle has ended.");
    const game = arcadeDefinitionSchema.parse(puzzle.definition);
    const deadline = new Date(
      Math.min(
        midnight(now),
        game.kind === "RECALL" ? now.getTime() + game.duration * 1000 : Infinity,
      ),
    );
    const run = await this.db.arcadeRun
      .upsert({
        where: { puzzleId_userId: key },
        update: {},
        create: { ...key, deadline, progress: initialProgress() },
      })
      .catch(async (error) => {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002")
          return this.db.arcadeRun.findUniqueOrThrow({ where: { puzzleId_userId: key } });
        throw error;
      });
    return view(puzzle, await this.expire(run));
  }
  async act(slug: string, date: string, userId: string, action: ArcadeAction) {
    const puzzle = await this.puzzle(slug, date);
    const key = { puzzleId: puzzle.id, userId };
    const stored = await this.db.arcadeRun.findUnique({ where: { puzzleId_userId: key } });
    if (!stored) throw new ConflictException("Start the puzzle first.");
    const run = await this.expire(stored);
    const progress = arcadeProgressSchema.parse(run.progress);
    if (
      progress.status !== "IN_PROGRESS" ||
      action.type === "expire" ||
      run.revision !== action.revision
    )
      return view(puzzle, run);
    const game = arcadeDefinitionSchema.parse(puzzle.definition);
    if (game.kind === "LINKS" && action.type === "group") {
      const ids = new Map(
        game.groups.flatMap((group) =>
          group.tiles.map((tile) => [tileToken(puzzle.id, tile.id), tile.id] as const),
        ),
      );
      action = { ...action, value: action.value.map((token) => ids.get(token) ?? "") };
    }
    const next = play(game, progress, action);
    if (!next) throw new BadRequestException("That move is unavailable.");
    const updated = await this.db.arcadeRun.updateMany({
      where: { id: run.id, revision: run.revision, deadline: { gt: new Date() } },
      data: { progress: next, revision: next.revision },
    });
    if (updated.count) return view(puzzle, { ...run, progress: next, revision: next.revision });
    return view(
      puzzle,
      await this.expire(await this.db.arcadeRun.findUniqueOrThrow({ where: { id: run.id } })),
    );
  }
  async studioList() {
    return this.db.arcadePuzzle.findMany({
      orderBy: [{ date: "desc" }, { slug: "asc" }],
      take: 50,
    });
  }
  async save(input: ArcadePuzzleInput, actor: StaffIdentity) {
    const { slug, date, definition, ...fields } = input;
    const data = { ...fields, kind: definition.kind, definition };
    const key = { slug, date };
    const existing = await this.db.arcadePuzzle.findUnique({ where: { slug_date: key } });
    if (existing?.published)
      throw new ConflictException(
        "Published puzzles are immutable. Create a puzzle for another UTC date.",
      );
    return writeStudioChange(this.db, actor, "GAME", existing ? "DRAFT" : null, async (tx) => {
      const row = existing
        ? await tx.arcadePuzzle.update({ where: { id: existing.id, published: false }, data })
        : await tx.arcadePuzzle.create({ data: { ...key, ...data } });
      return { ...row, status: row.published ? "PUBLISHED" : "DRAFT" };
    });
  }
}
