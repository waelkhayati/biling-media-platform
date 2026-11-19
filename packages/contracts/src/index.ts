import type {
  CreateShowInput,
  PublishedEpisode,
  PublishedEpisodeDetails,
  PublishedShow,
  PublishedShowDetails,
  ShowStatus,
} from "@biling/schemas";

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
export type PublishedShowDetail = PublishedShowDetails;
export type PublishedEpisodeDetail = PublishedEpisodeDetails;
export type * from "./admin.js";
export type {
  ArticleBlock,
  ArticleInput,
  ArticleUpdate,
  ArticleSummary,
  ArticleDetail,
  ArticleList,
  StudioArticle,
  ArticleQuery,
} from "@biling/schemas";

export type {
  ContentSearchQuery,
  ContentSearchResults,
  PublishedShowFilters,
} from "@biling/schemas";
