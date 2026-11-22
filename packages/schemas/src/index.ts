import { z } from "zod";
import { articleSummarySchema } from "./articles.js";
export * from "./articles.js";
export { articleInline } from "./article-inline.js";
import {
  contentQuerySchema,
  contentSlugSchema,
  showStatusSchema,
  youtubeVideoIdSchema,
} from "./content-fields.js";

export * from "./content-fields.js";
export * from "./admin.js";
export * from "./audience.js";
export * from "./community.js";
export * from "./games.js";
export * from "./arcade.js";
export * from "./quiz-selection.js";

export const createShowSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().pipe(contentSlugSchema),
  description: z.string().trim().max(5000).optional(),
});

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

const publishedShowIdentitySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  posterUrl: z.string().url().optional(),
  featured: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const publishedShowSchema = publishedShowIdentitySchema.extend({
  episodeCount: z.number().int().nonnegative(),
  latestEpisode: publishedEpisodeSchema.optional(),
});

export const publicShowMetadataSchema = z.object({
  genre: z.string().trim().min(1).max(80).optional().catch(undefined),
  releaseYear: z.number().int().min(1900).max(9999).optional().catch(undefined),
  trailerYoutubeVideoId: youtubeVideoIdSchema.optional().catch(undefined),
});

export const publishedShowDetailSchema = publishedShowIdentitySchema.extend({
  metadata: publicShowMetadataSchema,
  episodes: z.array(publishedEpisodeSchema),
});

export const publishedEpisodeDetailSchema = z.object({
  episode: publishedEpisodeSchema,
  show: publishedShowIdentitySchema,
  relatedEpisodes: z.array(publishedEpisodeSchema),
});

const contentResultLimitSchema = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(24));

export const publishedShowFiltersSchema = z.object({
  q: contentQuerySchema.optional(),
  featured: z.enum(["true", "false"]).optional(),
  limit: contentResultLimitSchema.optional(),
});

export const contentSearchQuerySchema = z.object({
  q: contentQuerySchema,
  limit: contentResultLimitSchema.default(12),
});

export const contentSearchResultsSchema = z.object({
  shows: z.array(publishedShowSchema),
  episodes: z.array(publishedEpisodeSchema),
  articles: z.array(articleSummarySchema).default([]),
  hasMore: z.object({
    shows: z.boolean(),
    episodes: z.boolean(),
    articles: z.boolean().default(false),
  }),
});

export type ShowStatus = z.infer<typeof showStatusSchema>;
export type CreateShowInput = z.infer<typeof createShowSchema>;
export type PublishedEpisode = z.infer<typeof publishedEpisodeSchema>;
export type PublishedShow = z.infer<typeof publishedShowSchema>;
export type PublishedShowDetails = z.infer<typeof publishedShowDetailSchema>;
export type PublishedEpisodeDetails = z.infer<typeof publishedEpisodeDetailSchema>;
export type PublishedShowFilters = z.infer<typeof publishedShowFiltersSchema>;
export type ContentSearchQuery = z.infer<typeof contentSearchQuerySchema>;
export type ContentSearchResults = z.infer<typeof contentSearchResultsSchema>;
