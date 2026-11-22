"use server";

import {
  arcadeActionSchema,
  arcadeDateSchema,
  arcadeViewSchema,
  contentSlugSchema,
  type ArcadeAction,
} from "@biling/schemas";
import { gamesRequest } from "@/lib/audience-api";

export async function arcadeCommand(slug: string, date: string, action?: ArcadeAction) {
  if (!contentSlugSchema.safeParse(slug).success || !arcadeDateSchema.safeParse(date).success)
    return { error: "Invalid puzzle." };
  const move = action && arcadeActionSchema.safeParse(action);
  if (move && !move.success) return { error: "Invalid move." };
  try {
    const response = await gamesRequest(
      "/" + slug + "/" + date + (move ? "/moves" : "/start"),
      {
        method: "POST",
        body: move ? JSON.stringify(move.data) : undefined,
      },
      "arcade",
    );
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      return {
        error:
          typeof failure?.message === "string" ? failure.message : "Could not update the puzzle.",
      };
    }
    return { view: arcadeViewSchema.parse(await response.json()) };
  } catch {
    return { error: "Unable to update the puzzle. Try again." };
  }
}
