import { z } from "zod";
import { contentSlugSchema } from "./content-fields.js";

export const arcadeKindSchema = z.enum(["MOT", "LINKS", "RECALL"]);
export const arcadeDateSchema = z.iso.date();
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(1).max(200);
const cells = z.enum(["exact", "present", "absent"]);

export const arcadeActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("word"),
    value: text,
    revision: z.number().int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal("group"),
    value: z.array(id).length(4),
    revision: z.number().int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal("recall"),
    value: text,
    revision: z.number().int().nonnegative(),
  }),
  z.strictObject({ type: z.literal("expire"), revision: z.number().int().nonnegative() }),
]);
export type ArcadeAction = z.infer<typeof arcadeActionSchema>;

const definition = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("MOT"),
    language: z.literal("en"),
    solution: z.string().regex(/^[A-Z]{4,7}$/),
    dictionary: z
      .array(z.string().regex(/^[A-Z]{4,7}$/))
      .max(5000)
      .default([]),
    guesses: z.number().int().min(2).max(10),
  }),
  z.strictObject({
    kind: z.literal("LINKS"),
    groups: z
      .array(
        z.strictObject({
          title: text,
          tiles: z.array(z.strictObject({ id, label: text })).length(4),
        }),
      )
      .length(4),
    mistakes: z.number().int().min(1).max(8),
  }),
  z.strictObject({
    kind: z.literal("RECALL"),
    duration: z.number().int().min(10).max(900),
    foldAccents: z.boolean(),
    answers: z
      .array(z.strictObject({ label: text, aliases: z.array(text).max(20) }))
      .min(2)
      .max(64),
  }),
]);
export type ArcadeDefinition = z.infer<typeof definition>;

export function normalizeMotWord(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .replace(/[œŒ]/g, "OE")
    .replace(/[æÆ]/g, "AE")
    .replace(/[a-z]/g, (letter) => letter.toUpperCase());
}

export function normalizeRecall(value: string, foldAccents: boolean) {
  const text = value
    .normalize(foldAccents ? "NFKD" : "NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
  return foldAccents ? text.replace(/(\p{Script=Latin})\p{M}+/gu, "$1") : text;
}

export const arcadeDefinitionSchema = definition.superRefine((value, context) => {
  function invalid(message: string) {
    context.addIssue({ code: "custom", message });
  }
  if (value.kind === "MOT") {
    if (
      value.dictionary.some((word) => word.length !== value.solution.length) ||
      new Set(value.dictionary).size !== value.dictionary.length
    )
      invalid("Use unique extra words of the same length as the solution.");
  } else if (value.kind === "LINKS") {
    const tiles = value.groups.flatMap((group) => group.tiles);
    if (
      new Set(tiles.map((tile) => tile.id)).size !== 16 ||
      new Set(tiles.map((tile) => tile.label.toLowerCase())).size !== 16
    )
      invalid("Use 16 distinct tile IDs and labels in four disjoint groups.");
  } else {
    const aliases = new Map<string, number>();
    value.answers.forEach((answer, index) => {
      for (const alias of [answer.label, ...answer.aliases]) {
        const key = normalizeRecall(alias, value.foldAccents);
        if (aliases.has(key) && aliases.get(key) !== index)
          invalid("Answers cannot share an alias.");
        aliases.set(key, index);
      }
    });
  }
});

export const arcadePuzzleInputSchema = z.strictObject({
  slug: contentSlugSchema,
  title: text,
  description: text,
  date: z.iso.date(),
  published: z.boolean(),
  definition: arcadeDefinitionSchema,
});
export type ArcadePuzzleInput = z.infer<typeof arcadePuzzleInputSchema>;

export const arcadeSummarySchema = z.object({
  slug: contentSlugSchema,
  title: text,
  description: text,
  date: z.iso.date(),
  kind: arcadeKindSchema,
  activity: z.enum(["IN_PROGRESS", "COMPLETED", "EXPIRED"]).optional(),
});
export type ArcadeSummary = z.infer<typeof arcadeSummarySchema>;

export const arcadeProgressSchema = z.object({
  revision: z.number().int().nonnegative(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "EXPIRED"]),
  words: z.array(z.object({ value: z.string(), cells: z.array(cells) })),
  solved: z.array(z.number().int().nonnegative()),
  mistakes: z.number().int().nonnegative(),
  found: z.array(z.number().int().nonnegative()),
  feedback: z.string().nullable(),
});
export type ArcadeProgress = z.infer<typeof arcadeProgressSchema>;

export const arcadeViewSchema = arcadeSummarySchema.extend({
  serverNow: z.iso.datetime(),
  deadline: z.iso.datetime().nullable(),
  progress: arcadeProgressSchema
    .pick({ revision: true, status: true, words: true, mistakes: true, feedback: true })
    .nullable(),
  limit: z.number().int().positive(),
  wordLength: z.number().int().positive().nullable(),
  tiles: z.array(z.object({ id, label: text })),
  groups: z.array(
    z.object({ title: text, tiles: z.array(z.object({ id, label: text })), solved: z.boolean() }),
  ),
  slots: z.array(z.object({ label: text.nullable(), found: z.boolean() })),
  solution: z.string().nullable(),
  won: z.boolean(),
});
export type ArcadeView = z.infer<typeof arcadeViewSchema>;
