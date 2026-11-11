import { Inject, Injectable } from "@nestjs/common";
import { publishedEpisodeSchema, publishedShowSchema } from "@biling/schemas";
import type { PublishedEpisodeSummary, PublishedShowSummary } from "@biling/contracts";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ContentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findPublishedShows(): Promise<PublishedShowSummary[]> {
    const shows = await this.prisma.show.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            episodes: { where: { status: "PUBLISHED", publishedAt: { not: null } } },
          },
        },
        episodes: {
          where: { status: "PUBLISHED", publishedAt: { not: null } },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    return shows.map((show) => {
      const { episodes, _count, ...details } = show;
      const latestEpisode = episodes[0];

      return publishedShowSchema.parse({
        id: details.id,
        title: details.title,
        slug: details.slug,
        description: details.description ?? undefined,
        posterUrl: details.posterUrl ?? undefined,
        featured: details.featured,
        episodeCount: _count.episodes,
        latestEpisode: latestEpisode ? this.toPublishedEpisode(latestEpisode, details) : undefined,
        createdAt: details.createdAt.toISOString(),
        updatedAt: details.updatedAt.toISOString(),
      });
    });
  }

  async findLatestPublishedEpisodes(): Promise<PublishedEpisodeSummary[]> {
    const episodes = await this.prisma.episode.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        show: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return episodes.map((episode) => this.toPublishedEpisode(episode, episode.show));
  }

  private toPublishedEpisode(
    episode: {
      id: string;
      showId: string;
      title: string;
      slug: string;
      description: string | null;
      episodeNumber: number | null;
      durationSeconds: number | null;
      youtubeVideoId: string | null;
      publishedAt: Date | null;
    },
    show: { id: string; title: string; slug: string },
  ): PublishedEpisodeSummary {
    return publishedEpisodeSchema.parse({
      id: episode.id,
      showId: episode.showId,
      showTitle: show.title,
      showSlug: show.slug,
      title: episode.title,
      slug: episode.slug,
      description: episode.description ?? undefined,
      episodeNumber: episode.episodeNumber ?? undefined,
      durationSeconds: episode.durationSeconds ?? undefined,
      youtubeVideoId: episode.youtubeVideoId ?? undefined,
      publishedAt: episode.publishedAt?.toISOString(),
    });
  }
}
