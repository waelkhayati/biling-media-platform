import type { CreateShowInput, PublishedEpisode, PublishedShow, ShowStatus } from "@biling/schemas";

export interface ShowSummary extends CreateShowInput {
  id: string;
  status: ShowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeSummary {
  id: string;
  showId: string;
  title: string;
  slug: string;
  description?: string;
  episodeNumber?: number;
  durationSeconds?: number;
  publishedAt?: string;
}

export type PublishedShowSummary = PublishedShow;
export type PublishedEpisodeSummary = PublishedEpisode;
