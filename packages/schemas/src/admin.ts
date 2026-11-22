import { z } from "zod";
import { contentSlugSchema, showStatusSchema, youtubeVideoIdSchema } from "./content-fields.js";

export const staffRoleSchema = z.enum(["ADMIN", "EDITOR"]);
export const staffEmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const staffContentIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const staffProvisionPasswordMinLength = 8;
export const staffProvisionPasswordSchema = z
  .string()
  .min(staffProvisionPasswordMinLength)
  .max(128);
export const staffTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const staffLoginSchema = z.strictObject({
  email: staffEmailSchema,
  password: z.string().min(1).max(128),
  setupCode: staffTokenSchema.optional(),
});
export const staffIdentitySchema = z.object({
  id: z.string(),
  email: staffEmailSchema,
  role: staffRoleSchema,
});
export const staffSessionSchema = z.object({
  token: staffTokenSchema,
  expiresAt: z.iso.datetime(),
  account: staffIdentitySchema,
});

export const staffChallengeSchema = z.object({
  token: staffTokenSchema,
  expiresAt: z.iso.datetime(),
  kind: z.enum(["ENROLL", "MFA"]),
});
export const staffOtpInputSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
export const staffRecoveryInputSchema = z.strictObject({
  code: staffTokenSchema,
  password: staffProvisionPasswordSchema,
});
export const staffAccessActionSchema = z.strictObject({
  action: z.enum(["DISABLE", "ENABLE", "REVOKE"]),
});
export const staffInviteInputSchema = z.strictObject({
  email: staffEmailSchema,
  role: staffRoleSchema,
});
export const staffInvitationSchema = staffInviteInputSchema.extend({
  code: staffTokenSchema,
  expiresAt: z.iso.datetime(),
});
export type StaffInviteInput = z.infer<typeof staffInviteInputSchema>;
export type StaffInvitation = z.infer<typeof staffInvitationSchema>;
export const staffAuditQuerySchema = z.object({
  kind: z.enum(["SHOW", "EPISODE", "ARTICLE", "GAME", "STAFF"]).optional(),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,4}$/)
    .transform(Number)
    .default(1),
});
export type StaffChallengeResult = z.infer<typeof staffChallengeSchema>;
export type StaffRecoveryInput = z.infer<typeof staffRecoveryInputSchema>;
export type StaffAccessAction = z.infer<typeof staffAccessActionSchema>["action"];
export type StaffAuditQuery = z.infer<typeof staffAuditQuerySchema>;

export function youtubeIdFromInput(value: string): string | undefined {
  if (youtubeVideoIdSchema.safeParse(value).success) return value;
  if (!URL.canParse(value)) return;

  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) return;

  let candidate: string | undefined;
  if (url.hostname === "youtu.be") {
    candidate = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    candidate =
      url.pathname === "/watch" && url.searchParams.getAll("v").length === 1
        ? (url.searchParams.get("v") ?? undefined)
        : /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (url.hostname === "www.youtube-nocookie.com") {
    candidate = /^\/embed\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  }
  return youtubeVideoIdSchema.safeParse(candidate).data;
}

const youtubeInputSchema = z
  .string()
  .trim()
  .max(500)
  .transform((input, context) => {
    const id = youtubeIdFromInput(input);
    if (id) return id;
    context.addIssue({
      code: "custom",
      message: "Enter a YouTube video ID or an HTTPS YouTube video URL.",
    });
    return z.NEVER;
  });

export const staffArtworkUrlSchema = z
  .url({ protocol: /^https$/, hostname: z.regexes.domain })
  .max(2048)
  .refine((input) => {
    if (!URL.canParse(input)) return false;
    const url = new URL(input);
    return !url.username && !url.password && !url.port && !url.hostname.endsWith(".localhost");
  }, "Use an HTTPS image URL on a public hostname.");

const staffContentFields = {
  title: z.string().trim().min(1).max(120),
  slug: contentSlugSchema,
  description: z.string().trim().max(5000).nullable(),
  status: showStatusSchema,
};

export const staffShowInputSchema = z.strictObject({
  ...staffContentFields,
  posterUrl: staffArtworkUrlSchema.nullable(),
  featured: z.boolean(),
  genre: z.string().trim().min(1).max(80).nullable(),
  releaseYear: z.number().int().min(1900).max(9999).nullable(),
  trailerYoutubeVideoId: youtubeInputSchema.nullable(),
});

const staffEpisodeInput = z.strictObject({
  ...staffContentFields,
  showId: staffContentIdSchema,
  episodeNumber: z.number().int().min(1).max(2147483647).nullable(),
  durationSeconds: z.number().int().min(1).max(2147483647).nullable(),
  youtubeVideoId: youtubeInputSchema.nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
});

const publicationDateRequired = (input: z.infer<typeof staffEpisodeInput>) =>
  input.status !== "PUBLISHED" || input.publishedAt !== null;
const publicationDateIssue = {
  path: ["publishedAt"],
  message: "A published episode needs a publication date.",
};

export const staffEpisodeInputSchema = staffEpisodeInput.refine(
  publicationDateRequired,
  publicationDateIssue,
);
export const staffShowUpdateSchema = staffShowInputSchema.extend({ revision: z.iso.datetime() });
export const staffEpisodeUpdateSchema = staffEpisodeInput
  .extend({ revision: z.iso.datetime() })
  .refine(publicationDateRequired, publicationDateIssue);

export const staffListQuerySchema = z.object({
  status: showStatusSchema.optional(),
  showId: staffContentIdSchema.optional(),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,5}$/)
    .transform(Number)
    .default(1),
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffIdentity = z.infer<typeof staffIdentitySchema>;
export type StaffSession = z.infer<typeof staffSessionSchema>;
export type StaffLogin = z.infer<typeof staffLoginSchema>;
export type StaffShowInput = z.infer<typeof staffShowInputSchema>;
export type StaffEpisodeInput = z.infer<typeof staffEpisodeInputSchema>;
export type StaffShowUpdate = z.infer<typeof staffShowUpdateSchema>;
export type StaffEpisodeUpdate = z.infer<typeof staffEpisodeUpdateSchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
