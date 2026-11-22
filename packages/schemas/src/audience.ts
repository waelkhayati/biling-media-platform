import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(12, "Use at least 12 characters.").max(128);
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Use 3 to 24 letters, numbers or underscores.");
const displayName = z.string().trim().min(1, "Enter a display name.").max(60);
const avatarUrl = z
  .url({ protocol: /^https$/, hostname: z.regexes.domain })
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return !url.username && !url.password && !url.port && !url.hostname.endsWith(".localhost");
    } catch {
      return false;
    }
  }, "Enter an HTTPS image URL on a public domain.");

export const audienceTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const audienceLoginSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export const audienceRegisterSchema = z.strictObject({ email, password, username, displayName });
export const audienceEmailSchema = z.strictObject({ email });
const challenge = z.strictObject({ token: audienceTokenSchema });
export const audienceVerifySchema = challenge.extend({
  password: audienceLoginSchema.shape.password,
});
export const audienceResetSchema = challenge.extend({ password });
export const audienceProfileUpdateSchema = z.strictObject({
  username,
  displayName,
  biography: z.string().trim().min(1).max(320).nullable(),
  avatarUrl: avatarUrl.nullable(),
});
export const audienceProfileSchema = audienceProfileUpdateSchema
  .extend({
    id: z.string(),
    email,
    role: z.literal("USER"),
    emailVerified: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .strip();
export const audienceSessionSchema = z.object({
  token: audienceTokenSchema,
  expiresAt: z.iso.datetime(),
  user: audienceProfileSchema,
});
export const audienceCapabilitiesSchema = z.object({
  emailAvailable: z.boolean(),
  registration: z.enum(["verify", "local", "unavailable"]),
});
export type AudienceProfile = z.infer<typeof audienceProfileSchema>;
export type AudienceProfileUpdate = z.infer<typeof audienceProfileUpdateSchema>;
export type AudienceRegister = z.infer<typeof audienceRegisterSchema>;
export type AudienceLogin = z.infer<typeof audienceLoginSchema>;
export type AudienceSession = z.infer<typeof audienceSessionSchema>;
export type AudienceCapabilities = z.infer<typeof audienceCapabilitiesSchema>;
