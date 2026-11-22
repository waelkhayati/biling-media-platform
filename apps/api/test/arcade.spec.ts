import { arcadeDefinitionSchema, normalizeRecall } from "@biling/schemas";
import { ArcadeService } from "../src/games/arcade.service";
import { initialProgress, play, wordFeedback } from "../src/games/arcade-rules";

test("Mot allocates duplicate letters after exact matches and rejects words outside the dictionary", () => {
  expect(wordFeedback("APPLE", "ALLEY")).toEqual([
    "exact",
    "present",
    "absent",
    "present",
    "absent",
  ]);
  const game = arcadeDefinitionSchema.parse({
    kind: "MOT",
    language: "en",
    solution: "APPLE",
    dictionary: ["APPLE", "ALLEY"],
    guesses: 2,
  });
  const invalid = play(game, initialProgress(), { type: "word", value: "zzzzz", revision: 0 })!;
  expect(invalid.words).toEqual([]);
  const wrongLength = play(game, invalid, { type: "word", value: "cat", revision: 1 })!;
  expect(wrongLength.words).toEqual([]);
  const valid = play(game, wrongLength, { type: "word", value: "brick", revision: 2 })!;
  expect(valid.words.map((row) => row.value)).toEqual(["BRICK"]);
  const win = play(game, valid, { type: "word", value: "apple", revision: 3 })!;
  expect(win.status).toBe("COMPLETED");
});

test("Mot accepts French accents, ligatures, and editor-supplied Tunisian Latin words", () => {
  const game = arcadeDefinitionSchema.parse({
    kind: "MOT",
    language: "en",
    solution: "STAGE",
    dictionary: ["SAHHA"],
    guesses: 6,
  });
  let progress = initialProgress();
  for (const [input, tiles] of [
    ["élève", "ELEVE"],
    ["cœur", "COEUR"],
    ["sahha", "SAHHA"],
  ]) {
    progress = play(game, progress, { type: "word", value: input, revision: progress.revision })!;
    expect(progress.words.at(-1)?.value).toBe(tiles);
  }
});

test("Links ignores order, locks solved tiles, and caps mistakes", () => {
  const game = arcadeDefinitionSchema.parse({
    kind: "LINKS",
    mistakes: 1,
    groups: Array.from({ length: 4 }, (_, group) => ({
      title: "Group " + group,
      tiles: Array.from({ length: 4 }, (_, tile) => ({
        id: group + "-" + tile,
        label: "Tile " + group + "-" + tile,
      })),
    })),
  });
  const group = ["0-3", "0-2", "0-0", "0-1"];
  const first = play(game, initialProgress(), { type: "group", value: group, revision: 0 })!;
  expect(first.solved).toEqual([0]);
  expect(play(game, first, { type: "group", value: group, revision: 1 })).toBeNull();
  const loss = play(game, first, {
    type: "group",
    value: ["1-0", "1-1", "1-2", "2-0"],
    revision: 1,
  })!;
  expect(loss).toMatchObject({ status: "COMPLETED", mistakes: 1 });
  expect(play(game, loss, { type: "group", value: group, revision: 2 })).toBeNull();
});

const recall = {
  kind: "RECALL",
  duration: 60,
  foldAccents: true,
  answers: [
    { label: "Béja", aliases: ["باجة"] },
    { label: "Sfax", aliases: ["Sfa9es", "صفاقس"] },
  ],
} as const;

test("Recall handles Arabic and curated transliteration and rejects ambiguous aliases", () => {
  expect(normalizeRecall("  BÉJA ", true)).toBe("beja");
  expect(normalizeRecall("  ألف   باء ", true)).toBe("ألف باء");
  const game = arcadeDefinitionSchema.parse(recall);
  const first = play(game, initialProgress(), { type: "recall", value: "باجة", revision: 0 })!;
  const duplicate = play(game, first, { type: "recall", value: "BEJA", revision: 1 })!;
  expect(duplicate.found).toEqual([0]);
  expect(play(game, duplicate, { type: "recall", value: "sfa9es", revision: 2 })).toMatchObject({
    found: [0, 1],
    status: "COMPLETED",
  });
  expect(
    arcadeDefinitionSchema.safeParse({
      ...recall,
      answers: [...recall.answers, { label: "Another", aliases: ["BEJA"] }],
    }).success,
  ).toBe(false);
});

test("the API masks undiscovered answers and restores accepted answers at the original deadline", async () => {
  const puzzle = {
    id: "puzzle",
    slug: "recall",
    title: "Recall",
    description: "Name both",
    date: new Date().toISOString().slice(0, 10),
    kind: "RECALL",
    published: true,
    definition: recall,
  };
  let run = {
    id: "run",
    revision: 0,
    deadline: new Date(Date.now() + 60_000),
    progress: initialProgress(),
  };
  const service = new ArcadeService({
    arcadePuzzle: { findUnique: async () => puzzle },
    arcadeRun: {
      findUnique: async () => run,
      findUniqueOrThrow: async () => run,
      updateMany: async ({
        where,
        data,
      }: {
        where: { revision: number };
        data: Pick<typeof run, "revision" | "progress">;
      }) => {
        if (where.revision !== run.revision) return { count: 0 };
        run = { ...run, ...data };
        return { count: 1 };
      },
    },
  } as never);
  const originalDeadline = run.deadline.toISOString();
  expect((await service.read("recall", puzzle.date)).slots.map((slot) => slot.label)).toEqual([
    null,
    null,
  ]);
  await Promise.all([
    service.act("recall", puzzle.date, "user", { type: "recall", value: "Sfa9es", revision: 0 }),
    service.act("recall", puzzle.date, "user", { type: "recall", value: "Sfa9es", revision: 0 }),
  ]);
  const restored = await service.read("recall", puzzle.date, "user");
  expect(restored.deadline).toBe(originalDeadline);
  expect(restored.progress?.revision).toBe(1);
  expect(restored.slots.map((slot) => slot.label)).toEqual([null, "Sfax"]);
  expect(JSON.stringify(restored)).not.toContain("Sfa9es");
  run.deadline = new Date(0);
  const expired = await service.read("recall", puzzle.date, "user");
  expect(expired.progress?.status).toBe("EXPIRED");
  expect(expired.slots.map((slot) => slot.label)).toEqual(["Béja", "Sfax"]);
});
