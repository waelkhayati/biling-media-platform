"use server";

import { revalidatePath } from "next/cache";
import { gameAttemptInputSchema, gameAttemptResultSchema } from "@biling/schemas";
import type { GameAttemptResult } from "@biling/contracts";
import { gamesRequest } from "@/lib/audience-api";

export type GamePlayState = { error?: string; result?: GameAttemptResult };
export async function submitGameAttempt(slug: string, _state: GamePlayState, form: FormData): Promise<GamePlayState> {
  void _state;
  const answers = form.getAll("answer").map((value) => {
    const [questionId, optionId] = String(value).split(":");
    return { questionId, optionId };
  });
  const input = gameAttemptInputSchema.safeParse({ answers, practice: form.get("practice") === "true" });
  if (!input.success) return { error: "Answer every question before submitting." };
  const response = await gamesRequest("/" + encodeURIComponent(slug) + "/attempts", { method: "POST", body: JSON.stringify(input.data) }).catch(() => null);
  if (!response?.ok) {
    const body: unknown = response ? await response.json().catch(() => null) : null;
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : "Could not submit your answers.";
    return { error: message };
  }
  revalidatePath("/profile");
  return { result: gameAttemptResultSchema.parse(await response.json()) };
}
