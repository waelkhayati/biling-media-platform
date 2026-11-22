"use server";

import { revalidatePath } from "next/cache";
import { arcadePuzzleInputSchema } from "@biling/schemas";
import { studioRequest } from "@/lib/studio-api";

export async function saveArcadePuzzle(input: unknown) {
  const parsed = arcadePuzzleInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((issue) => (issue.path.length ? issue.path.join(".") + ": " : "") + issue.message)
        .join(" "),
    };
  try {
    const response = await studioRequest("/arcade", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      return {
        error: typeof failure?.message === "string" ? failure.message : "Could not save puzzle.",
      };
    }
    revalidatePath("/admin/arcade");
    revalidatePath("/games");
    return { saved: true };
  } catch {
    return { error: "Could not reach the arcade service." };
  }
}
