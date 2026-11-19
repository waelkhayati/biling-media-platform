import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  StaffEpisodeInput,
  StaffEpisodeUpdate,
  StaffListQuery,
  StaffIdentity,
  StaffShowInput,
  StaffShowUpdate,
  StudioContentItem,
  StudioDashboard,
  StudioEpisode,
  StudioList,
  StudioShow,
} from "@biling/contracts";
import { publicShowMetadataSchema } from "@biling/schemas";
import type { Episode, Prisma, Show } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";

import { authorizeStatus, writeStudioChange } from "./studio-write";

const pageSize = 50;
const recentOrder = [{ updatedAt: "desc" }, { id: "desc" }] as const;
const summarySelection = {
  id: true,
  title: true,
  slug: true,
  status: true,
  updatedAt: true,
} as const;
const showCount = { _count: { select: { episodes: true } } } as const;
const episodeShow = { show: { select: { title: true } } } as const;

function summary(row: Pick<Show, keyof typeof summarySelection>): StudioContentItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function firstPublication(row: Pick<Show, "firstPublishedAt" | "status" | "createdAt">) {
  return row.firstPublishedAt ?? (row.status === "PUBLISHED" ? row.createdAt : null);
}

function serializeShow(row: Show & { _count: { episodes: number } }): StudioShow {
  const metadata = publicShowMetadataSchema.safeParse(row.metadata).data;
  return {
    ...summary(row),
    description: row.description,
    posterUrl: row.posterUrl,
    featured: row.featured,
    firstPublishedAt: firstPublication(row)?.toISOString() ?? null,
    genre: metadata?.genre ?? null,
    releaseYear: metadata?.releaseYear ?? null,
    trailerYoutubeVideoId: metadata?.trailerYoutubeVideoId ?? null,
    episodeCount: row._count.episodes,
  };
}

function serializeEpisode(row: Episode & { show: { title: string } }): StudioEpisode {
  return {
    ...summary(row),
    description: row.description,
    showId: row.showId,
    showTitle: row.show.title,
    episodeNumber: row.episodeNumber,
    durationSeconds: row.durationSeconds,
    youtubeVideoId: row.youtubeVideoId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    firstPublishedAt: firstPublication(row)?.toISOString() ?? null,
  };
}

function showData(
  { genre, releaseYear, trailerYoutubeVideoId, ...fields }: StaffShowInput,
  existing?: Show,
) {
  const saved = existing?.metadata;
  const metadata: Prisma.InputJsonObject = {
    ...(saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {}),
    genre,
    releaseYear,
    trailerYoutubeVideoId,
  };
  return { ...fields, metadata };
}

@Injectable()
export class StudioService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dashboard(): Promise<StudioDashboard> {
    const orderBy = [...recentOrder];
    const [shows, episodes, recentShows, recentEpisodes] = await Promise.all([
      this.prisma.show.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.episode.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.show.findMany({ select: summarySelection, orderBy, take: 6 }),
      this.prisma.episode.findMany({ select: summarySelection, orderBy, take: 6 }),
    ]);
    const totals = (rows: typeof shows) => ({
      published: rows.find((row) => row.status === "PUBLISHED")?._count._all ?? 0,
      draft: rows.find((row) => row.status === "DRAFT")?._count._all ?? 0,
    });
    return {
      shows: totals(shows),
      episodes: totals(episodes),
      recent: [
        ...recentShows.map((row) => ({ ...summary(row), kind: "show" as const })),
        ...recentEpisodes.map((row) => ({ ...summary(row), kind: "episode" as const })),
      ]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 6),
    };
  }

  async shows({ status, page }: StaffListQuery): Promise<StudioList<StudioShow>> {
    const rows = await this.prisma.show.findMany({
      where: { status },
      include: showCount,
      orderBy: [...recentOrder],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    return {
      items: rows.slice(0, pageSize).map(serializeShow),
      page,
      hasMore: rows.length > pageSize,
    };
  }

  showOptions() {
    return this.prisma.show.findMany({
      select: { id: true, title: true, status: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    });
  }

  async show(id: string): Promise<StudioShow> {
    const row = await this.prisma.show.findUnique({ where: { id }, include: showCount });
    if (!row) throw new NotFoundException("Production not found.");
    return serializeShow(row);
  }

  async createShow(input: StaffShowInput, actor: StaffIdentity): Promise<StudioShow> {
    authorizeStatus(actor.role, input.status);
    return serializeShow(
      await writeStudioChange(this.prisma, actor, "SHOW", null, (tx) =>
        tx.show.create({
          data: {
            ...showData(input),
            firstPublishedAt: input.status === "PUBLISHED" ? new Date() : null,
          },
          include: showCount,
        }),
      ),
    );
  }

  async updateShow(
    id: string,
    { revision, ...input }: StaffShowUpdate,
    actor: StaffIdentity,
  ): Promise<StudioShow> {
    const existing = await this.prisma.show.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Production not found.");
    authorizeStatus(actor.role, input.status, existing.status);
    const firstPublishedAt = firstPublication(existing);
    if (firstPublishedAt && existing.slug !== input.slug) {
      throw new ConflictException("This production has been published. Its public slug is locked.");
    }
    return serializeShow(
      await writeStudioChange(this.prisma, actor, "SHOW", existing.status, (tx) =>
        tx.show.update({
          where: { id, updatedAt: new Date(revision) },
          data: {
            ...showData(input, existing),
            firstPublishedAt:
              firstPublishedAt ?? (input.status === "PUBLISHED" ? new Date() : null),
            updatedAt: new Date(Math.max(existing.updatedAt.getTime() + 1, Date.now())),
          },
          include: showCount,
        }),
      ),
    );
  }

  async episodes({ status, showId, page }: StaffListQuery): Promise<StudioList<StudioEpisode>> {
    const rows = await this.prisma.episode.findMany({
      where: { status, showId },
      include: episodeShow,
      orderBy: [...recentOrder],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    return {
      items: rows.slice(0, pageSize).map(serializeEpisode),
      page,
      hasMore: rows.length > pageSize,
    };
  }

  async episode(id: string): Promise<StudioEpisode> {
    const row = await this.prisma.episode.findUnique({ where: { id }, include: episodeShow });
    if (!row) throw new NotFoundException("Episode not found.");
    return serializeEpisode(row);
  }

  async createEpisode(input: StaffEpisodeInput, actor: StaffIdentity): Promise<StudioEpisode> {
    authorizeStatus(actor.role, input.status);
    return serializeEpisode(
      await writeStudioChange(this.prisma, actor, "EPISODE", null, (tx) =>
        tx.episode.create({
          data: {
            ...input,
            publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
            firstPublishedAt: input.status === "PUBLISHED" ? new Date() : null,
          },
          include: episodeShow,
        }),
      ),
    );
  }

  async updateEpisode(
    id: string,
    { revision, ...input }: StaffEpisodeUpdate,
    actor: StaffIdentity,
  ): Promise<StudioEpisode> {
    const existing = await this.prisma.episode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Episode not found.");
    authorizeStatus(actor.role, input.status, existing.status);
    const firstPublishedAt = firstPublication(existing);
    if (firstPublishedAt && (existing.slug !== input.slug || existing.showId !== input.showId)) {
      throw new ConflictException(
        "This episode has been published. Its slug and production are locked.",
      );
    }
    return serializeEpisode(
      await writeStudioChange(this.prisma, actor, "EPISODE", existing.status, (tx) =>
        tx.episode.update({
          where: { id, updatedAt: new Date(revision) },
          data: {
            ...input,
            publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
            firstPublishedAt:
              firstPublishedAt ?? (input.status === "PUBLISHED" ? new Date() : null),
            updatedAt: new Date(Math.max(existing.updatedAt.getTime() + 1, Date.now())),
          },
          include: episodeShow,
        }),
      ),
    );
  }
}
