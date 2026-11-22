import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  normalizeMotWord,
  normalizeRecall,
  type ArcadeAction,
  type ArcadeDefinition,
  type ArcadeProgress,
} from "@biling/schemas";

type Letter = ArcadeProgress["words"][number]["cells"][number];
let englishWords: ReadonlySet<string> | undefined;
let frenchWords: ReadonlySet<string> | undefined;

function isEnglishWord(word: string) {
  englishWords ??= new Set(
    readFileSync(join(dirname(require.resolve("word-list")), "words.txt"), "utf8")
      .split(/\r?\n/)
      .filter((entry) => /^[a-z]{4,7}$/.test(entry)),
  );
  return englishWords.has(word.toLowerCase());
}

function isFrenchWord(word: string) {
  if (!frenchWords) {
    const entries: string[] = JSON.parse(
      readFileSync(require.resolve("an-array-of-french-words"), "utf8"),
    );
    frenchWords = new Set(
      entries.map(normalizeMotWord).filter((entry) => /^[A-Z]{4,7}$/.test(entry)),
    );
  }
  return frenchWords.has(word);
}

export function wordFeedback(solution: string, guess: string): Letter[] {
  const counts = new Map<string, number>();
  const feedback = Array.from<Letter>({ length: solution.length }).fill("absent");
  for (let i = 0; i < solution.length; i++) {
    if (solution[i] === guess[i]) feedback[i] = "exact";
    else counts.set(solution[i], (counts.get(solution[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (feedback[i] === "exact") continue;
    const count = counts.get(guess[i]) ?? 0;
    if (count > 0) {
      feedback[i] = "present";
      counts.set(guess[i], count - 1);
    }
  }
  return feedback;
}

export function initialProgress(): ArcadeProgress {
  return {
    revision: 0,
    status: "IN_PROGRESS",
    words: [],
    solved: [],
    mistakes: 0,
    found: [],
    feedback: null,
  };
}

export function won(game: ArcadeDefinition, progress: ArcadeProgress) {
  switch (game.kind) {
    case "MOT":
      return progress.words.some((row) => row.value === game.solution);
    case "LINKS":
      return progress.solved.length === game.groups.length;
    case "RECALL":
      return progress.found.length === game.answers.length;
  }
}

export function play(
  game: ArcadeDefinition,
  previous: ArcadeProgress,
  action: ArcadeAction,
): ArcadeProgress | null {
  if (previous.status !== "IN_PROGRESS") return null;
  const next = { ...previous, revision: previous.revision + 1 };
  if (game.kind === "MOT" && action.type === "word") {
    const guess = normalizeMotWord(action.value);
    if (!/^[A-Z]+$/.test(guess) || guess.length !== game.solution.length)
      return { ...next, feedback: `Enter a word that fits the ${game.solution.length}-tile grid.` };
    if (
      guess !== game.solution &&
      !game.dictionary.includes(guess) &&
      !isEnglishWord(guess) &&
      !isFrenchWord(guess)
    )
      return {
        ...next,
        feedback:
          "Word not found. Try an English or French word, or a Tunisian word accepted for this puzzle.",
      };
    if (previous.words.some((row) => row.value === guess))
      return { ...next, feedback: "You already tried that word." };
    next.words = [...previous.words, { value: guess, cells: wordFeedback(game.solution, guess) }];
    next.feedback = null;
    if (guess === game.solution || next.words.length >= game.guesses) next.status = "COMPLETED";
    return next;
  }
  if (game.kind === "LINKS" && action.type === "group") {
    const picked = new Set(action.value);
    const available = game.groups.flatMap((group, index) =>
      previous.solved.includes(index) ? [] : group.tiles.map((tile) => tile.id),
    );
    if (picked.size !== 4 || [...picked].some((id) => !available.includes(id))) return null;
    const index = game.groups.findIndex((group) =>
      group.tiles.every((tile) => picked.has(tile.id)),
    );
    if (index < 0) {
      next.mistakes++;
      next.feedback = "Those four don’t work together.";
    } else {
      next.solved = [...previous.solved, index];
      next.feedback = "Group found.";
    }
    if (next.mistakes >= game.mistakes || won(game, next)) next.status = "COMPLETED";
    return next;
  }
  if (game.kind === "RECALL" && action.type === "recall") {
    const normalized = normalizeRecall(action.value, game.foldAccents);
    const index = game.answers.findIndex((entry) =>
      [entry.label, ...entry.aliases].some(
        (value) => normalizeRecall(value, game.foldAccents) === normalized,
      ),
    );
    if (index < 0) return { ...next, feedback: "That answer didn’t match." };
    if (previous.found.includes(index)) return { ...next, feedback: "Already on the board." };
    next.found = [...previous.found, index];
    next.feedback = "Answer unlocked.";
    if (won(game, next)) next.status = "COMPLETED";
    return next;
  }
  return null;
}
