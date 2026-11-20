import type { ShowStatus } from "@biling/schemas";

export type {
  StaffAuditQuery,
  StaffAccessAction,
  StaffChallengeResult,
  StaffEpisodeInput,
  StaffEpisodeUpdate,
  StaffIdentity,
  StaffInvitation,
  StaffInviteInput,
  StaffListQuery,
  StaffLogin,
  StaffRecoveryInput,
  StaffRole,
  StaffSession,
  StaffShowInput,
  StaffShowUpdate,
} from "@biling/schemas";

export interface StaffAccessRow {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  active: boolean;
  enrolled: boolean;
  pendingInvitation?: boolean;
}

export interface StudioAuditRow {
  id: string;
  actor: string;
  resource: string;
  resourceId: string;
  title: string;
  action: string;
  previousStatus: ShowStatus | null;
  nextStatus: ShowStatus | null;
  createdAt: string;
}

export interface StudioContentItem {
  id: string;
  title: string;
  slug: string;
  status: ShowStatus;
  updatedAt: string;
}

export interface StudioShow extends StudioContentItem {
  description: string | null;
  posterUrl: string | null;
  featured: boolean;
  firstPublishedAt: string | null;
  genre: string | null;
  releaseYear: number | null;
  trailerYoutubeVideoId: string | null;
  episodeCount: number;
}

export interface StudioEpisode extends StudioContentItem {
  description: string | null;
  showId: string;
  showTitle: string;
  episodeNumber: number | null;
  durationSeconds: number | null;
  youtubeVideoId: string | null;
  publishedAt: string | null;
  firstPublishedAt: string | null;
}

export interface StudioList<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}

export interface StudioDashboard {
  shows: { published: number; draft: number };
  episodes: { published: number; draft: number };
  recent: (StudioContentItem & { kind: "show" | "episode" })[];
}
