import { z } from "zod";

export const showStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const contentSlugSchema = z
  .string()
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const youtubeVideoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);
