import { z } from "zod";
import { publishedEpisodeSchema, publishedShowSchema } from "@biling/schemas";

const apiBaseUrl = (process.env.API_BASE_URL ?? "http://localhost:3001/api/v1").replace(/\/$/, "");

const showsResponseSchema = z.object({
  items: z.array(publishedShowSchema),
});

const episodesResponseSchema = z.object({
  items: z.array(publishedEpisodeSchema),
});

async function fetchApi(path: string): Promise<unknown> {
  const url = `${apiBaseUrl}${path}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Biling content API request failed (${response.status}): ${url}`);
  }

  return response.json();
}

export async function getHomeContent() {
  const [showsResponse, episodesResponse] = await Promise.all([
    fetchApi("/shows"),
    fetchApi("/episodes"),
  ]);

  return {
    shows: showsResponseSchema.parse(showsResponse).items,
    episodes: episodesResponseSchema.parse(episodesResponse).items,
  };
}
