import { z } from "zod";
import { contentSlugSchema } from "./content-fields.js";

export const communityTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("article"), slug: contentSlugSchema }),
  z.object({
    type: z.literal("episode"),
    showSlug: contentSlugSchema,
    slug: contentSlugSchema,
  }),
  z.object({ type: z.literal("show"), slug: contentSlugSchema }),
]);
export const communityIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const commentBodySchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (value) =>
      !Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 && code !== 9 && code !== 10 && code !== 13;
      }),
    "Comment contains unsupported characters.",
  );
export const commentCreateSchema = z.strictObject({
  target: communityTargetSchema,
  body: commentBodySchema,
  parentId: communityIdSchema.nullable().default(null),
});
export const commentUpdateSchema = z.strictObject({ body: commentBodySchema });
export const commentReportSchema = z.strictObject({
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATEFUL",
    "SEXUAL",
    "VIOLENCE",
    "MISINFORMATION",
    "OTHER",
  ]),
  details: z.string().trim().min(1).max(500).nullable().default(null),
});
export const commentListQuerySchema = communityTargetSchema.and(
  z.object({
    sort: z.enum(["newest", "oldest"]).default("newest"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(30).default(20),
  }),
);
export const moderationQuerySchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const moderationActionSchema = z.strictObject({
  action: z.enum(["HIDE", "RESTORE", "REMOVE", "DISMISS_REPORTS"]),
  note: z.string().trim().min(1).max(500).nullable().default(null),
});
export type CommunityTarget = z.infer<typeof communityTargetSchema>;
export type CommentCreate = z.infer<typeof commentCreateSchema>;
export type CommentUpdate = z.infer<typeof commentUpdateSchema>;
export type CommentReportInput = z.infer<typeof commentReportSchema>;
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
export type ModerationQuery = z.infer<typeof moderationQuerySchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;
