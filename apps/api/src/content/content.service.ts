import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  publishedEpisodeDetailSchema,
  publishedEpisodeSchema,
  publishedShowDetailSchema,
  publishedShowSchema,
  publicShowMetadataSchema,
  youtubeVideoIdSchema,
} from "@biling/schemas";
import type {
  ContentSearchQuery,
  ContentSearchResults,
  PublishedEpisodeDetail,
  PublishedEpisodeSummary,
  PublishedShowDetail,
  PublishedShowFilters,
  PublishedShowSummary,
} from "@biling/contracts";
import type { Episode, Prisma, Show } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";

import { searchArticles } from "../articles/article.service";

const publishedEpisodeFilter = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} satisfies Prisma.EpisodeWhereInput;

const newestEpisodes = [
  { publishedAt: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.EpisodeOrderByWithRelationInput[];

function matchContentText(query: string) {
  // Prisma maps contains to SQL LIKE/ILIKE. Treat its wildcard characters as literal text.
  const pattern = { contains: query.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } as const;
  return [{ title: pattern }, { description: pattern }];
}

@Injectable()
export class ContentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findPublishedShows({ q, featured, limit }: PublishedShowFilters = {}): Promise<
    PublishedShowSummary[]
  > {
    const shows = await this.prisma.show.findMany({
      where: {
        status: "PUBLISHED",
        featured: featured === undefined ? undefined : featured === "true",
        OR: q ? matchContentText(q) : undefined,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: {
        _count: {
          select: {
            episodes: { where: publishedEpisodeFilter },
          },
        },
        episodes: {
          where: publishedEpisodeFilter,
          orderBy: newestEpisodes,
          take: 1,
        },
      },
    });

    return shows.map((show) => {
      const { episodes, _count, ...details } = show;
      const latestEpisode = episodes[0];

      return publishedShowSchema.parse({
        ...this.toPublishedShowIdentity(details),
        episodeCount: _count.episodes,
        latestEpisode: latestEpisode ? this.toPublishedEpisode(latestEpisode, details) : undefined,
      });
    });
  }

  async findLatestPublishedEpisodes(): Promise<PublishedEpisodeSummary[]> {
    return this.findPublishedEpisodes(12);
  }

  async searchPublishedContent({ q, limit }: ContentSearchQuery): Promise<ContentSearchResults> {
    const [shows, episodes, articles] = await Promise.all([
      this.findPublishedShows({ q, limit: limit + 1 }),
      this.findPublishedEpisodes(limit + 1, q),
      searchArticles(this.prisma, q, limit + 1),
    ]);

    return {
      shows: shows.slice(0, limit),
      episodes: episodes.slice(0, limit),
      articles: articles.slice(0, limit),
      hasMore: {
        shows: shows.length > limit,
        episodes: episodes.length > limit,
        articles: articles.length > limit,
      },
    };
  }

  private async findPublishedEpisodes(
    take: number,
    query?: string,
  ): Promise<PublishedEpisodeSummary[]> {
    const episodes = await this.prisma.episode.findMany({
      where: {
        ...publishedEpisodeFilter,
        show: { status: "PUBLISHED" },
        ...(query ? { OR: matchContentText(query) } : {}),
      },
      orderBy: newestEpisodes,
      take,
      include: {
        show: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return episodes.map((episode) => this.toPublishedEpisode(episode, episode.show));
  }

  async findPublishedShow(slug: string): Promise<PublishedShowDetail> {
    const show = await this.prisma.show.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        episodes: { where: publishedEpisodeFilter, orderBy: newestEpisodes },
      },
    });

    if (!show) throw new NotFoundException("Show not found");

    const metadata = publicShowMetadataSchema.safeParse(show.metadata);

    return publishedShowDetailSchema.parse({
      ...this.toPublishedShowIdentity(show),
      metadata: metadata.success ? metadata.data : {},
      episodes: show.episodes.map((episode) => this.toPublishedEpisode(episode, show)),
    });
  }

  async findPublishedEpisode(
    showSlug: string,
    episodeSlug: string,
  ): Promise<PublishedEpisodeDetail> {
    const episode = await this.prisma.episode.findFirst({
      where: {
        ...publishedEpisodeFilter,
        slug: episodeSlug,
        show: { slug: showSlug, status: "PUBLISHED" },
      },
      include: {
        show: {
          include: {
            episodes: {
              where: { ...publishedEpisodeFilter, slug: { not: episodeSlug } },
              orderBy: newestEpisodes,
              take: 3,
            },
          },
        },
      },
    });

    if (!episode) throw new NotFoundException("Episode not found");

    return publishedEpisodeDetailSchema.parse({
      episode: this.toPublishedEpisode(episode, episode.show),
      show: this.toPublishedShowIdentity(episode.show),
      relatedEpisodes: episode.show.episodes.map((related) =>
        this.toPublishedEpisode(related, episode.show),
      ),
    });
  }

  private toPublishedShowIdentity(show: Show) {
    return {
      id: show.id,
      title: show.title,
      slug: show.slug,
      description: show.description ?? undefined,
      posterUrl: show.posterUrl ?? undefined,
      featured: show.featured,
      createdAt: show.createdAt.toISOString(),
      updatedAt: show.updatedAt.toISOString(),
    };
  }

  private toPublishedEpisode(
    episode: Episode,
    show: Pick<Show, "id" | "title" | "slug">,
  ): PublishedEpisodeSummary {
    return publishedEpisodeSchema.parse({
      id: episode.id,
      showId: episode.showId,
      showTitle: show.title,
      showSlug: show.slug,
      title: episode.title,
      slug: episode.slug,
      description: episode.description ?? undefined,
      episodeNumber:
        episode.episodeNumber && episode.episodeNumber > 0 ? episode.episodeNumber : undefined,
      durationSeconds:
        episode.durationSeconds && episode.durationSeconds > 0
          ? episode.durationSeconds
          : undefined,
      youtubeVideoId: youtubeVideoIdSchema.safeParse(episode.youtubeVideoId).data,
      publishedAt: episode.publishedAt?.toISOString(),
    });
  }
}
