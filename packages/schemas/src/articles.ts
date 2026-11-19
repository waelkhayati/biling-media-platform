import { z } from "zod";
import { staffArtworkUrlSchema, staffContentIdSchema, staffListQuerySchema } from "./admin.js";
import { contentSlugSchema, showStatusSchema, youtubeVideoIdSchema } from "./content-fields.js";

const text = z.string().trim().min(1).max(5000);
const optional = (limit: number) => z.string().trim().min(1).max(limit).nullable();
const label = z.string().trim().min(1).max(80);
const relation = z.object({ title: z.string(), slug: contentSlugSchema });
export const articleLanguageSchema = z.enum(["en", "fr", "ar"]);
export const articleBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("paragraph"), text }),
  z.strictObject({ type: z.literal("heading"), text }),
  z.strictObject({ type: z.literal("quote"), text }),
  z.strictObject({
    type: z.enum(["ordered", "unordered"]),
    items: z.array(text.max(1000)).min(1).max(30),
  }),
  z.strictObject({
    type: z.literal("image"),
    url: staffArtworkUrlSchema,
    alt: z.string().trim().min(1).max(250),
    credit: optional(200),
  }),
  z.strictObject({ type: z.literal("youtube"), videoId: youtubeVideoIdSchema }),
]);
export const articleBodyMaxBytes = 50_000;
export const articleBodySchema = z
  .array(articleBlockSchema)
  .max(100)
  .refine(
    (blocks) => new TextEncoder().encode(JSON.stringify(blocks)).length <= articleBodyMaxBytes,
    "Article body is too long.",
  );
const fields = {
  title: z.string().trim().min(1).max(160),
  slug: contentSlugSchema.refine((slug) => slug !== "sitemap", "This slug is reserved."),
  excerpt: optional(500),
  author: label,
  category: label,
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(40)
        .transform((tag) => tag.toLowerCase()),
    )
    .max(12)
    .transform((tags) => [...new Set(tags)]),
  language: articleLanguageSchema,
  imageUrl: staffArtworkUrlSchema.nullable(),
  imageAlt: optional(250),
  imageCaption: optional(300),
  imageCredit: optional(200),
  featured: z.boolean(),
  seoTitle: optional(70),
  seoDescription: optional(160),
};
const input = z.strictObject({
  ...fields,
  status: showStatusSchema,
  body: articleBodySchema,
  showIds: z.array(staffContentIdSchema).max(10),
  episodeIds: z.array(staffContentIdSchema).max(10),
});
function validatePublication(data: z.infer<typeof input>, ctx: z.RefinementCtx) {
  if (data.status === "PUBLISHED" && !data.body.length)
    ctx.addIssue({
      code: "custom",
      path: ["body"],
      message: "Add a content block before publishing.",
    });
  if (data.imageUrl && !data.imageAlt)
    ctx.addIssue({
      code: "custom",
      path: ["imageAlt"],
      message: "Describe the featured image for readers who cannot see it.",
    });
}
export const articleInputSchema = input.superRefine(validatePublication);
export const articleUpdateSchema = input
  .extend({ revision: z.iso.datetime() })
  .superRefine(validatePublication);
export const articleRequestDocs = {
  create: z.toJSONSchema(articleInputSchema, {
    io: "input",
    target: "openapi-3.0",
    unrepresentable: "any",
  }),
  update: z.toJSONSchema(articleUpdateSchema, {
    io: "input",
    target: "openapi-3.0",
    unrepresentable: "any",
  }),
};
export const articleSummarySchema = z.object({
  ...fields,
  id: z.string(),
  publishedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const articleSitemapSchema = z
  .array(z.object({ slug: contentSlugSchema, updatedAt: z.iso.datetime() }))
  .max(49_997);
export const articleListSchema = z.object({
  items: z.array(articleSummarySchema),
  page: z.number(),
  hasMore: z.boolean(),
  categories: z.array(z.string()),
});
export const articleDetailSchema = articleSummarySchema.extend({
  body: articleBodySchema,
  related: z.array(articleSummarySchema),
  shows: z.array(relation),
  episodes: z.array(relation.extend({ showSlug: contentSlugSchema })),
});
export const studioArticleSchema = input
  .extend({
    id: staffContentIdSchema,
    updatedAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
    publishedAt: z.iso.datetime().nullable(),
    firstPublishedAt: z.iso.datetime().nullable(),
  })
  .strip();
export type ArticleDetail = z.infer<typeof articleDetailSchema>;
export type ArticleList = z.infer<typeof articleListSchema>;
export type StudioArticle = z.infer<typeof studioArticleSchema>;

const articleLimit = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(24))
  .default(12);
export const articleQuerySchema = staffListQuerySchema
  .pick({ page: true })
  .extend({
    category: label.optional(),
    tag: z.string().trim().min(1).max(40).toLowerCase().optional(),
    show: contentSlugSchema.optional(),
    episode: contentSlugSchema.optional(),
    limit: articleLimit,
    featured: z.literal("true").optional(),
  })
  .refine((input) => !input.episode || !!input.show, "Specify the parent show for an episode.");
export const studioArticleQuerySchema = staffListQuerySchema
  .pick({ page: true, status: true })
  .extend({
    category: label.optional(),
    author: label.optional(),
  });
export type ArticleBlock = z.infer<typeof articleBlockSchema>;
export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;
export type ArticleSummary = z.infer<typeof articleSummarySchema>;
export type ArticleQuery = z.infer<typeof articleQuerySchema>;
export type StudioArticleQuery = z.infer<typeof studioArticleQuerySchema>;
