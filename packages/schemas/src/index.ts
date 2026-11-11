import { z } from "zod";

export const showStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const createShowSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(5000).optional(),
});

export const youtubeVideoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

export const publishedEpisodeSchema = z.object({
  id: z.string(),
  showId: z.string(),
  showTitle: z.string(),
  showSlug: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  episodeNumber: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  youtubeVideoId: youtubeVideoIdSchema.optional(),
  publishedAt: z.string().datetime(),
});

export const publishedShowSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  posterUrl: z.string().url().optional(),
  featured: z.boolean(),
  episodeCount: z.number().int().nonnegative(),
  latestEpisode: publishedEpisodeSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ShowStatus = z.infer<typeof showStatusSchema>;
export type CreateShowInput = z.infer<typeof createShowSchema>;
export type PublishedEpisode = z.infer<typeof publishedEpisodeSchema>;
export type PublishedShow = z.infer<typeof publishedShowSchema>;
