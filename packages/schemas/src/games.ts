import { z } from "zod";
import { staffArtworkUrlSchema, staffContentIdSchema, staffListQuerySchema } from "./admin.js";
import { contentSlugSchema, showStatusSchema } from "./content-fields.js";

export const gameTypeSchema = z.enum(["TRIVIA", "PERSONALITY", "DAILY_CHALLENGE"]);
const optionalText = (limit: number) => z.string().trim().min(1).max(limit).nullable();
const outcomeKeySchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
export const gameOptionInputSchema = z.strictObject({
  text: z.string().trim().min(1).max(500),
  correct: z.boolean().default(false),
  outcomeKey: outcomeKeySchema.nullable().default(null),
});
export const gameQuestionInputSchema = z.strictObject({
  prompt: z.string().trim().min(1).max(1000),
  explanation: optionalText(2000),
  options: z.array(gameOptionInputSchema).min(2).max(6),
});
export const gameOutcomeInputSchema = z.strictObject({
  key: outcomeKeySchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  imageUrl: staffArtworkUrlSchema.nullable(),
});

const gameFields = z.strictObject({
  title: z.string().trim().min(1).max(160),
  slug: contentSlugSchema,
  description: optionalText(5000),
  artworkUrl: staffArtworkUrlSchema.nullable(),
  type: gameTypeSchema,
  featured: z.boolean(),
  status: showStatusSchema,
  availableFrom: z.iso.datetime().nullable(),
  availableUntil: z.iso.datetime().nullable(),
  timeLimitSeconds: z.number().int().min(5).max(3600).nullable(),
  questions: z.array(gameQuestionInputSchema).min(1).max(30),
  outcomes: z.array(gameOutcomeInputSchema).max(12),
});

function gameRules(data: z.infer<typeof gameFields>, ctx: z.RefinementCtx) {
  if (data.availableFrom && data.availableUntil && data.availableFrom >= data.availableUntil)
    ctx.addIssue({ code: "custom", path: ["availableUntil"], message: "Must be after availability start." });
  const outcomes = new Set(data.outcomes.map((outcome) => outcome.key));
  if (outcomes.size !== data.outcomes.length)
    ctx.addIssue({ code: "custom", path: ["outcomes"], message: "Outcome keys must be unique." });
  for (const [index, question] of data.questions.entries()) {
    const correct = question.options.filter((option) => option.correct).length;
    if (data.type === "PERSONALITY") {
      if (!data.outcomes.length)
        ctx.addIssue({ code: "custom", path: ["outcomes"], message: "Add personality outcomes." });
      question.options.forEach((option, optionIndex) => {
        if (!option.outcomeKey || !outcomes.has(option.outcomeKey))
          ctx.addIssue({
            code: "custom",
            path: ["questions", index, "options", optionIndex, "outcomeKey"],
            message: "Choose one of the configured outcome keys.",
          });
      });
    } else if (correct !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "options"],
        message: "Trivia questions need exactly one correct answer.",
      });
    }
  }
}

export const gameInputSchema = gameFields.superRefine(gameRules);
export const gameUpdateSchema = gameFields.extend({ revision: z.iso.datetime() }).superRefine(gameRules);
export const gameRequestDocs = {
  create: z.toJSONSchema(gameInputSchema, { io: "input", target: "openapi-3.0" }),
  update: z.toJSONSchema(gameUpdateSchema, { io: "input", target: "openapi-3.0" }),
};

const publicOption = z.object({ id: staffContentIdSchema, text: z.string() });
const publicQuestion = z.object({ id: staffContentIdSchema, prompt: z.string(), options: z.array(publicOption) });
export const gameSummarySchema = z.object({
  id: staffContentIdSchema,
  slug: contentSlugSchema,
  title: z.string(),
  description: z.string().nullable(),
  artworkUrl: z.string().url().nullable(),
  type: gameTypeSchema,
  featured: z.boolean(),
  questionCount: z.number().int().nonnegative(),
  availableFrom: z.iso.datetime().nullable(),
  availableUntil: z.iso.datetime().nullable(),
  timeLimitSeconds: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});
export const gameDetailSchema = gameSummarySchema.extend({ questions: z.array(publicQuestion) });
export const gameListSchema = z.object({ items: z.array(gameSummarySchema), page: z.number(), hasMore: z.boolean(), categories: z.array(gameTypeSchema) });
export const gameAttemptInputSchema = z.strictObject({
  answers: z.array(z.strictObject({ questionId: staffContentIdSchema, optionId: staffContentIdSchema })).min(1).max(30),
  practice: z.boolean().default(false),
});
export const gameAttemptResultSchema = z.object({
  score: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
  official: z.boolean(),
  date: z.string().nullable(),
  outcome: z.object({ key: z.string(), title: z.string(), description: z.string(), imageUrl: z.string().url().nullable() }).nullable(),
  answers: z.array(z.object({ questionId: staffContentIdSchema, correctOptionId: staffContentIdSchema.nullable(), explanation: z.string().nullable() })),
});
export const gameQuerySchema = staffListQuerySchema.pick({ page: true }).extend({ type: gameTypeSchema.optional(), featured: z.literal("true").optional() });
export const studioGameQuerySchema = staffListQuerySchema.pick({ page: true, status: true }).extend({ type: gameTypeSchema.optional() });
export const studioGameSchema = gameInputSchema.extend({ id: staffContentIdSchema, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), firstPublishedAt: z.iso.datetime().nullable() });
export type GameInput = z.infer<typeof gameInputSchema>;
export type GameUpdate = z.infer<typeof gameUpdateSchema>;
export type GameAttemptInput = z.infer<typeof gameAttemptInputSchema>;
export type GameSummary = z.infer<typeof gameSummarySchema>;
export type GameDetail = z.infer<typeof gameDetailSchema>;
export type GameList = z.infer<typeof gameListSchema>;
export type GameAttemptResult = z.infer<typeof gameAttemptResultSchema>;
export type GameQuery = z.infer<typeof gameQuerySchema>;
export type StudioGameQuery = z.infer<typeof studioGameQuerySchema>;
export type StudioGame = z.infer<typeof studioGameSchema>;
