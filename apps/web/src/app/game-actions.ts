"use server";
import { revalidatePath } from "next/cache";
import {
  contentSlugSchema,
  dailyQuizMoveSchema,
  dailyQuizProgressSchema,
  gameAttemptInputSchema,
  gameAttemptResultSchema,
  type DailyQuizMove,
} from "@biling/schemas";
import type { GameAttemptResult } from "@biling/contracts";
import { gamesRequest } from "@/lib/audience-api";

export type GamePlayState = { error?: string; result?: GameAttemptResult };
export async function syncDailyQuiz(slug: string, selection?: DailyQuizMove) {
  const move = selection && dailyQuizMoveSchema.safeParse(selection);
  if (!contentSlugSchema.safeParse(slug).success || (move && !move.success))
    return { error: "Invalid answer." };
  try {
    const response = await gamesRequest("/" + slug + "/progress", {
      method: move ? "PUT" : "GET",
      body: move ? JSON.stringify(move.data) : undefined,
    });
    if (!response.ok)
      return { error: "Could not restore or save your official answers. Try again." };
    return { draft: dailyQuizProgressSchema.parse(await response.json()) };
  } catch {
    return { error: "Could not restore or save your official answers. Try again." };
  }
}

export async function submitGameAttempt(
  slug: string,
  _state: GamePlayState,
  form: FormData,
): Promise<GamePlayState> {
  void _state;
  const answers = form.getAll("answer").map((value) => {
    const [questionId, optionId] = String(value).split(":");
    return { questionId, optionId };
  });
  const input = gameAttemptInputSchema.safeParse({
    answers,
    practice: form.get("practice") === "true",
  });
  if (!input.success) return { error: "Answer every question before submitting." };
  const response = await gamesRequest("/" + encodeURIComponent(slug) + "/attempts", {
    method: "POST",
    body: JSON.stringify(input.data),
  }).catch(() => null);
  if (!response?.ok) {
    const body = await response?.json().catch(() => null);
    return {
      error: typeof body?.message === "string" ? body.message : "Could not submit your answers.",
    };
  }
  revalidatePath("/profile");
  return { result: gameAttemptResultSchema.parse(await response.json()) };
}
