import {
  dailyQuizProgressSchema,
  type DailyQuizMove,
  articleDetailSchema,
  articleListSchema,
  audienceCapabilitiesSchema,
  audienceProfileSchema,
  audienceSessionSchema,
  contentSearchResultsSchema,
  gameAttemptResultSchema,
  gameDetailSchema,
  gameListSchema,
  publishedEpisodeDetailSchema,
  publishedEpisodeSchema,
  publishedShowDetailSchema,
  publishedShowSchema,
} from "@biling/schemas";
import type { CommunityCommentList, CommunityEngagement, FollowedShow } from "@biling/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base || !(base.startsWith("https://") || (__DEV__ && base.startsWith("http://")))) {
    throw new ApiError("Set EXPO_PUBLIC_API_URL to the API address. Release builds require HTTPS.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(base + path, {
      method: options.method ?? "GET",
      signal: controller.signal,
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const raw = await response.text();
    let value;
    try {
      value = raw ? JSON.parse(raw) : undefined;
    } catch {
      if (response.ok) throw new ApiError("The API returned an unreadable response.");
    }
    if (!response.ok) {
      const message = value?.message;
      throw new ApiError(
        typeof message === "string"
          ? message
          : response.status === 404
            ? "This item is unavailable."
            : "The request could not be completed.",
        response.status,
      );
    }
    try {
      return schema ? schema.parse(value) : (value as T);
    } catch {
      throw new ApiError("The API returned an unexpected response.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request timed out."
        : "Unable to reach Biling Media. Check your connection.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const segment = encodeURIComponent;
const list = <T>(schema: {
  parse: (value: unknown) => T;
  array: () => { parse: (value: unknown) => T[] };
}) => ({
  parse: (value: unknown) => schema.array().parse((value as { items?: unknown } | null)?.items),
});

export interface Attempt {
  id: string;
  score: number;
  totalQuestions: number;
  official: boolean;
  completedAt: string;
  game: { title: string; slug: string; type: string };
}

export const api = {
  dailyQuiz: (slug: string, token: string, body?: DailyQuizMove) =>
    request("/games/" + segment(slug) + "/progress", { token, body, method: body ? "PUT" : "GET" }, dailyQuizProgressSchema),
  shows: () => request("/shows", {}, list(publishedShowSchema)),
  episodes: () => request("/episodes", {}, list(publishedEpisodeSchema)),
  articles: (page = 1) => request("/articles?page=" + page, {}, articleListSchema),
  games: (page = 1, query?: string) =>
    request("/games?page=" + page + (query ? "&q=" + segment(query) : ""), {}, gameListSchema),
  search: (q: string) =>
    request("/search?limit=24&q=" + segment(q), {}, contentSearchResultsSchema),
  show: (slug: string) => request("/shows/" + segment(slug), {}, publishedShowDetailSchema),
  episode: (show: string, slug: string) =>
    request(
      "/shows/" + segment(show) + "/episodes/" + segment(slug),
      {},
      publishedEpisodeDetailSchema,
    ),
  article: (slug: string) => request("/articles/" + segment(slug), {}, articleDetailSchema),
  game: (slug: string) => request("/games/" + segment(slug), {}, gameDetailSchema),
  attempt: (slug: string, body: unknown, token?: string) =>
    request(
      "/games/" + segment(slug) + "/attempts",
      { method: "POST", body, token },
      gameAttemptResultSchema,
    ),
  capabilities: () => request("/audience/capabilities", {}, audienceCapabilitiesSchema),
  login: (body: unknown) =>
    request("/audience/login", { method: "POST", body }, audienceSessionSchema),
  me: (token: string) => request("/audience/me", { token }, audienceProfileSchema),
  update: (token: string, body: unknown) =>
    request("/audience/me", { token, method: "PATCH", body }, audienceProfileSchema),
  following: (token: string) => request<FollowedShow[]>("/community/following", { token }),
  history: (token: string) => request<Attempt[]>("/games/history", { token }),
  engagement: (query: string, token?: string) =>
    request<CommunityEngagement>("/community/engagement?" + query, { token }),
  comments: (query: string, page: number, token?: string) =>
    request<CommunityCommentList>("/community/comments?" + query + "&page=" + page, { token }),
};
