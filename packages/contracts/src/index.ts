import type {
  CreateShowInput,
  PublishedEpisode,
  PublishedEpisodeDetails,
  PublishedShow,
  PublishedShowDetails,
  ShowStatus,
} from "@biling/schemas";
import type { CommunityTarget } from "@biling/schemas";

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
  AudienceCapabilities,
  AudienceLogin,
  AudienceProfile,
  AudienceProfileUpdate,
  AudienceRegister,
  AudienceSession,
} from "@biling/schemas";
export type {
  CommunityTarget,
  CommentCreate,
  CommentUpdate,
  CommentReportInput,
  CommentListQuery,
  ModerationQuery,
  ModerationAction,
} from "@biling/schemas";

export interface CommunityAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}
export interface CommunityComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  owned: boolean;
  author: CommunityAuthor;
  replies: CommunityComment[];
}
export interface CommunityCommentList {
  items: CommunityComment[];
  page: number;
  hasMore: boolean;
}
export interface CommunityEngagement {
  likeCount: number;
  liked: boolean;
  followerCount: number;
  followed: boolean;
}
export interface FollowedShow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  posterUrl: string | null;
  followedAt: string;
}
export interface ModerationReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string };
}
export interface ModerationComment {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  author: CommunityAuthor;
  reports: ModerationReport[];
  target: CommunityTarget;
  history: { id: string; actor: string; action: string; note: string | null; createdAt: string }[];
}
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
