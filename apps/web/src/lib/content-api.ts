import { z } from "zod";
import type { ArticleQuery, PublishedShowFilters } from "@biling/contracts";
import {
  articleDetailSchema,
  articleListSchema,
  articleSitemapSchema,
  gameDetailSchema,
  gameListSchema,
  contentSearchResultsSchema,
  contentSlugSchema,
  publishedEpisodeDetailSchema,
  publishedEpisodeSchema,
  publishedShowDetailSchema,
  publishedShowSchema,
} from "@biling/schemas";
import { episodePath, showPath } from "./content-paths";

const apiBaseUrl = (process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api/v1").replace(/\/$/, "");
const notFound = Symbol("content not found");

const showsResponseSchema = z.object({
  items: z.array(publishedShowSchema),
});

const episodesResponseSchema = z.object({
  items: z.array(publishedEpisodeSchema),
});

async function fetchApi(path: string, allowNotFound = false): Promise<unknown> {
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, { cache: "no-store" });

  if (allowNotFound && response.status === 404) return notFound;

  if (!response.ok) {
    throw new Error(`Biling content API request failed (${response.status}): ${url}`);
  }

  return response.json();
}

export async function getShow(slug: string) {
  if (!contentSlugSchema.safeParse(slug).success) return null;
  const data = await fetchApi(showPath(slug), true);
  return data === notFound ? null : publishedShowDetailSchema.parse(data);
}

export async function getEpisode(showSlug: string, episodeSlug: string) {
  if (
    !contentSlugSchema.safeParse(showSlug).success ||
    !contentSlugSchema.safeParse(episodeSlug).success
  ) {
    return null;
  }
  const data = await fetchApi(episodePath(showSlug, episodeSlug), true);
  return data === notFound ? null : publishedEpisodeDetailSchema.parse(data);
}

export async function getHomeContent() {
  const [shows, episodesResponse] = await Promise.all([getPublishedShows(), fetchApi("/episodes")]);

  return {
    shows,
    episodes: episodesResponseSchema.parse(episodesResponse).items,
  };
}

export async function getPublishedShows({ q, featured, limit }: PublishedShowFilters = {}) {
  const params = new URLSearchParams();
  if (q !== undefined) params.set("q", q);
  if (featured !== undefined) params.set("featured", featured);
  if (limit !== undefined) params.set("limit", String(limit));
  const query = params.toString();
  return showsResponseSchema.parse(await fetchApi(query ? `/shows?${query}` : "/shows")).items;
}

export async function searchContent(q: string) {
  const query = new URLSearchParams({ q });
  return contentSearchResultsSchema.parse(await fetchApi(`/search?${query}`));
}

export async function getArticles(filters: Partial<ArticleQuery> = {}) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(name, String(value));
  }
  return articleListSchema.parse(await fetchApi("/articles?" + params));
}

export async function getArticle(slug: string) {
  if (!contentSlugSchema.safeParse(slug).success) return null;
  const data = await fetchApi("/articles/" + encodeURIComponent(slug), true);
  return data === notFound ? null : articleDetailSchema.parse(data);
}

export async function getArticleSitemap() {
  return articleSitemapSchema.parse(await fetchApi("/articles/sitemap"));
}

export async function getGames(filters: { page?: number; type?: string; featured?: "true" } = {}) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) if (value !== undefined) params.set(name, String(value));
  return gameListSchema.parse(await fetchApi("/games" + (params.size ? "?" + params : "")));
}

export async function getGame(slug: string) {
  if (!contentSlugSchema.safeParse(slug).success) return null;
  const data = await fetchApi("/games/" + encodeURIComponent(slug), true);
  return data === notFound ? null : gameDetailSchema.parse(data);
}
