import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StaffIdentity } from "@biling/contracts";
import {
  gameAttemptResultSchema,
  dailyQuizMoveSchema,
  gameDetailSchema,
  gameListSchema,
  gameSummarySchema,
  studioGameSchema,
  type GameAttemptInput,
  type DailyQuizMove,
  type GameInput,
  type GameQuery,
  type GameUpdate,
  type StudioGameQuery,
} from "@biling/schemas";
import { authorizeStatus, writeStudioChange } from "../admin/studio-write";
import { matchContentText } from "../common/content-match";
import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";

const active = (now = new Date()): Prisma.GameWhereInput => ({
  status: "PUBLISHED",
  AND: [{ OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] }, { OR: [{ availableUntil: null }, { availableUntil: { gt: now } }] }],
});
const gameSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  artworkUrl: true,
  type: true,
  featured: true,
  availableFrom: true,
  availableUntil: true,
  timeLimitSeconds: true,
  createdAt: true,
  _count: { select: { questions: true } },
} satisfies Prisma.GameSelect;

function summary(row: Prisma.GameGetPayload<{ select: typeof gameSelect }>) {
  return gameSummarySchema.parse({
    ...row,
    questionCount: row._count.questions,
    availableFrom: row.availableFrom?.toISOString() ?? null,
    availableUntil: row.availableUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}
function gameData(input: GameInput) {
  const { questions, outcomes, ...fields } = input;
  return {
    ...fields,
    availableFrom: fields.availableFrom ? new Date(fields.availableFrom) : null,
    availableUntil: fields.availableUntil ? new Date(fields.availableUntil) : null,
    questions: {
      create: questions.map((question, position) => ({
        position,
        prompt: question.prompt,
        explanation: question.explanation,
        options: { create: question.options.map((option, optionPosition) => ({ ...option, position: optionPosition })) },
      })),
    },
    outcomes: { create: outcomes },
  };
}
function utcDate() {
  return new Date().toISOString().slice(0, 10);
}
function duplicate(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === "P2002";
}

@Injectable()
export class GameService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list({ page, type, featured, q }: GameQuery) {
    const where = { ...active(), type, featured: featured ? true : undefined, OR: q ? matchContentText(q) : undefined };
    const [rows, types] = await Promise.all([
      this.prisma.game.findMany({ where, select: gameSelect, orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 13, skip: (page - 1) * 12 }),
      this.prisma.game.findMany({ where: active(), select: { type: true }, distinct: ["type"] }),
    ]);
    return gameListSchema.parse({ items: rows.slice(0, 12).map(summary), page, hasMore: rows.length > 12, categories: types.map((row) => row.type) });
  }

  async detail(slug: string) {
    const row = await this.prisma.game.findFirst({
      where: { slug, ...active() },
      select: { ...gameSelect, questions: { orderBy: { position: "asc" }, select: { id: true, prompt: true, options: { orderBy: { position: "asc" }, select: { id: true, text: true } } } } },
    });
    if (!row) throw new NotFoundException("Game not found.");
    return gameDetailSchema.parse({ ...summary(row), questions: row.questions });
  }

  async dailyProgress(slug: string, userId: string, move?: DailyQuizMove) {
    const date = utcDate();
    const game = await this.prisma.game.findFirst({
      where: { slug, ...active(), type: "DAILY_CHALLENGE" },
      select: { id: true, updatedAt: true, questions: { select: { id: true, options: { select: { id: true } } } } },
    });
    if (!game) throw new NotFoundException("Daily challenge unavailable.");
    if (move && !game.questions.some((question) => question.id === move.questionId && question.options.some((option) => option.id === move.optionId)))
      throw new BadRequestException("That answer is unavailable.");

    const key = { gameId: game.id, userId, date };
    const where = { gameId_userId_date: key };
    for (let attempt = 0; attempt < 5; attempt++) {
      const [completed, draft] = await Promise.all([
        this.prisma.gameAttempt.findFirst({ where: { gameId: game.id, userId, dailyDate: date, official: true }, select: { answers: true } }),
        this.prisma.dailyQuizProgress.findUnique({ where }),
      ]);
      if (completed) return { answers: dailyQuizMoveSchema.array().parse(completed.answers), completed: true };
      const answers = draft?.gameRevision.getTime() === game.updatedAt.getTime() ? dailyQuizMoveSchema.array().parse(draft.answers) : [];
      if (!move) return { answers, completed: false };
      const next = [...answers.filter((answer) => answer.questionId !== move.questionId), move];
      if (draft) {
        const saved = await this.prisma.dailyQuizProgress.updateMany({
          where: { ...key, revision: draft.revision },
          data: { revision: { increment: 1 }, answers: next, gameRevision: game.updatedAt },
        });
        if (saved.count) return { answers: next, completed: false };
      } else {
        try {
          await this.prisma.dailyQuizProgress.create({ data: { ...key, gameRevision: game.updatedAt, answers: next } });
          return { answers: next, completed: false };
        } catch (error) { if (!duplicate(error)) throw error; }
      }
    }
    throw new ConflictException("Your answers changed on another device. Reload and try again.");
  }

  async attempt(slug: string, input: GameAttemptInput, userId?: string) {
    const row = await this.prisma.game.findFirst({
      where: { slug, ...active() },
      include: { outcomes: true, questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
    });
    if (!row) throw new NotFoundException("Game not found.");
    if (input.answers.length !== row.questions.length) throw new BadRequestException("Answer every question before submitting.");
    const answers = new Map(input.answers.map((answer) => [answer.questionId, answer.optionId]));
    if (answers.size !== row.questions.length || row.questions.some((question) => !answers.has(question.id)))
      throw new BadRequestException("Your answers do not match this game.");
    const selected = row.questions.map((question) => {
      const option = question.options.find((item) => item.id === answers.get(question.id));
      if (!option) throw new BadRequestException("One or more selected answers are invalid.");
      return { question, option };
    });
    const official = row.type === "DAILY_CHALLENGE" && !input.practice;
    if (official && !userId) throw new ForbiddenException("Sign in to record today’s official challenge score.");
    const date = official ? utcDate() : null;
    if (date && userId) {
      const draft = await this.prisma.dailyQuizProgress.findUnique({
        where: { gameId_userId_date: { gameId: row.id, userId, date } },
      });
      if (draft) {
        const saved = dailyQuizMoveSchema.array().parse(draft.answers);
        if (draft.gameRevision.getTime() !== row.updatedAt.getTime() || saved.length !== answers.size || saved.some((answer) => answers.get(answer.questionId) !== answer.optionId))
          throw new ConflictException("Your saved answers changed. Reload the challenge and try again.");
      }
    }
    const score = row.type === "PERSONALITY" ? 0 : selected.filter(({ option }) => option.correct).length;
    let outcome = null;
    if (row.type === "PERSONALITY") {
      const totals = new Map<string, number>();
      for (const { option } of selected) totals.set(option.outcomeKey!, (totals.get(option.outcomeKey!) ?? 0) + 1);
      outcome = [...row.outcomes].sort((a, b) => ((totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0)) || a.key.localeCompare(b.key))[0] ?? null;
    }
    try {
      if (userId) await this.prisma.gameAttempt.create({
        data: {
          gameId: row.id, userId, official, dailyDate: date, score, totalQuestions: row.questions.length,
          outcomeKey: outcome?.key ?? null,
          answers: selected.map(({ question, option }) => ({ questionId: question.id, optionId: option.id })),
        },
      });
    } catch (error) {
      if (duplicate(error) && official) throw new ConflictException("You already completed today’s official challenge. Try practice mode instead.");
      throw error;
    }
    return gameAttemptResultSchema.parse({
      score, totalQuestions: row.questions.length, official, date,
      outcome: outcome && { key: outcome.key, title: outcome.title, description: outcome.description, imageUrl: outcome.imageUrl },
      answers: selected.map(({ question }) => ({ questionId: question.id, correctOptionId: row.type === "PERSONALITY" ? null : question.options.find((item) => item.correct)?.id ?? null, explanation: question.explanation })),
    });
  }

  async history(userId: string) {
    return this.prisma.gameAttempt.findMany({
      where: { userId }, orderBy: { completedAt: "desc" }, take: 30,
      select: { id: true, score: true, totalQuestions: true, official: true, dailyDate: true, completedAt: true, game: { select: { title: true, slug: true, type: true } } },
    });
  }

  async studioList({ page, status, type }: StudioGameQuery) {
    const rows = await this.prisma.game.findMany({ where: { status, type }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 51, skip: (page - 1) * 50, select: { id: true, title: true, slug: true, type: true, status: true, updatedAt: true, _count: { select: { attempts: true } } } });
    return { items: rows.slice(0, 50).map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString(), attemptCount: row._count.attempts })), page, hasMore: rows.length > 50 };
  }
  async studioDetail(id: string) {
    const row = await this.prisma.game.findUnique({ where: { id }, include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } }, outcomes: { orderBy: { key: "asc" } } } });
    if (!row) throw new NotFoundException("Game not found.");
    return studioGameSchema.parse({
      ...row, availableFrom: row.availableFrom?.toISOString() ?? null, availableUntil: row.availableUntil?.toISOString() ?? null,
      firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      questions: row.questions.map((question) => ({ prompt: question.prompt, explanation: question.explanation, options: question.options.map(({ text, correct, outcomeKey }) => ({ text, correct, outcomeKey })) })),
    });
  }
  async create(input: GameInput, actor: StaffIdentity) {
    authorizeStatus(actor.role, input.status);
    const firstPublishedAt = input.status === "PUBLISHED" ? new Date() : null;
    const row = await writeStudioChange(this.prisma, actor, "GAME", null, (tx) => tx.game.create({ data: { ...gameData(input), firstPublishedAt } }));
    return this.studioDetail(row.id);
  }
  async update(id: string, { revision, ...input }: GameUpdate, actor: StaffIdentity) {
    const current = await this.prisma.game.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Game not found.");
    authorizeStatus(actor.role, input.status, current.status);
    if (current.firstPublishedAt && current.slug !== input.slug) throw new ConflictException("This game has been published. Its public slug is locked.");
    const firstPublishedAt = current.firstPublishedAt ?? (input.status === "PUBLISHED" ? new Date() : null);
    const { questions, outcomes, ...fields } = gameData(input);
    const row = await writeStudioChange(this.prisma, actor, "GAME", current.status, (tx) => tx.game.update({ where: { id, updatedAt: new Date(revision) }, data: { ...fields, firstPublishedAt, questions: { deleteMany: {}, ...questions }, outcomes: { deleteMany: {}, ...outcomes }, updatedAt: new Date(Math.max(current.updatedAt.getTime() + 1, Date.now())) } }));
    return this.studioDetail(row.id);
  }
}
