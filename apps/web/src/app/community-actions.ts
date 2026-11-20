"use server";

import { revalidatePath } from "next/cache";
import {
  commentCreateSchema,
  commentReportSchema,
  commentUpdateSchema,
  communityIdSchema,
  communityTargetSchema,
} from "@biling/schemas";
import { communityRequest, sameAudienceOrigin } from "@/lib/audience-api";

export type CommunityState = { error?: string; success?: string };
const originError = { error: "Use this control from the configured Biling website." };
async function message(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" ? data.message : fallback;
}
function target(form: FormData) {
  try {
    return communityTargetSchema.safeParse(JSON.parse(String(form.get("target") ?? "")));
  } catch {
    return communityTargetSchema.safeParse(null);
  }
}
async function ready() {
  return await sameAudienceOrigin();
}

export async function addComment(
  path: string,
  _state: CommunityState,
  form: FormData,
): Promise<CommunityState> {
  if (!(await ready())) return originError;
  const parsedTarget = target(form);
  const input = commentCreateSchema.safeParse({
    target: parsedTarget.success ? parsedTarget.data : null,
    body: form.get("body"),
    parentId: String(form.get("parentId") ?? "").trim() || null,
  });
  if (!input.success) return { error: input.error.issues[0]?.message ?? "Enter a valid comment." };
  const response = await communityRequest(
    "/comments",
    { method: "POST", body: JSON.stringify(input.data) },
    true,
  ).catch(() => null);
  if (!response) return { error: "Comments are temporarily unavailable." };
  if (response.status === 401) return { error: "Sign in to join the discussion." };
  if (!response.ok) return { error: await message(response, "Could not post your comment.") };
  revalidatePath(path);
  return { success: "Comment posted." };
}

export async function editComment(
  path: string,
  id: string,
  _state: CommunityState,
  form: FormData,
): Promise<CommunityState> {
  if (!(await ready())) return originError;
  const input = commentUpdateSchema.safeParse({ body: form.get("body") });
  if (!input.success || !communityIdSchema.safeParse(id).success)
    return { error: "Enter a valid comment." };
  const response = await communityRequest(
    `/comments/${id}`,
    { method: "PATCH", body: JSON.stringify(input.data) },
    true,
  ).catch(() => null);
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not edit the comment.")
        : "Comments are temporarily unavailable.",
    };
  revalidatePath(path);
  return { success: "Comment updated." };
}

export async function deleteComment(
  path: string,
  id: string,
  _state: CommunityState,
): Promise<CommunityState> {
  void _state;
  if (!(await ready())) return originError;
  if (!communityIdSchema.safeParse(id).success) return { error: "Invalid comment." };
  const response = await communityRequest(`/comments/${id}`, { method: "DELETE" }, true).catch(
    () => null,
  );
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not delete the comment.")
        : "Comments are temporarily unavailable.",
    };
  revalidatePath(path);
  return { success: "Comment deleted." };
}

export async function reportComment(
  path: string,
  id: string,
  _state: CommunityState,
  form: FormData,
): Promise<CommunityState> {
  if (!(await ready())) return originError;
  const input = commentReportSchema.safeParse({
    reason: form.get("reason"),
    details: String(form.get("details") ?? "").trim() || null,
  });
  if (!input.success || !communityIdSchema.safeParse(id).success)
    return { error: "Choose a valid report reason." };
  const response = await communityRequest(
    `/comments/${id}/reports`,
    { method: "POST", body: JSON.stringify(input.data) },
    true,
  ).catch(() => null);
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not submit the report.")
        : "Reporting is temporarily unavailable.",
    };
  revalidatePath(path);
  return { success: "Report submitted for staff review." };
}

export async function toggleCommentLike(
  path: string,
  id: string,
  value: boolean,
  _state: CommunityState,
): Promise<CommunityState> {
  void _state;
  if (!(await ready())) return originError;
  if (!communityIdSchema.safeParse(id).success) return { error: "Invalid comment." };
  const response = await communityRequest(
    `/comments/${id}/likes`,
    { method: value ? "PUT" : "DELETE" },
    true,
  ).catch(() => null);
  if (response?.status === 401) return { error: "Sign in to react to comments." };
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not update your reaction.")
        : "Reactions are temporarily unavailable.",
    };
  revalidatePath(path);
  return {};
}

export async function toggleLike(
  path: string,
  value: boolean,
  _state: CommunityState,
  form: FormData,
): Promise<CommunityState> {
  if (!(await ready())) return originError;
  const parsed = target(form);
  if (!parsed.success || parsed.data.type === "show") return { error: "Invalid reaction." };
  const response = await communityRequest(
    "/likes",
    { method: value ? "PUT" : "DELETE", body: JSON.stringify(parsed.data) },
    true,
  ).catch(() => null);
  if (response?.status === 401) return { error: "Sign in to like this." };
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not update your like.")
        : "Reactions are temporarily unavailable.",
    };
  revalidatePath(path);
  return {};
}

export async function toggleFollow(
  path: string,
  slug: string,
  value: boolean,
  _state: CommunityState,
): Promise<CommunityState> {
  void _state;
  if (!(await ready())) return originError;
  const parsed = communityTargetSchema.safeParse({ type: "show", slug });
  if (!parsed.success) return { error: "Invalid production." };
  const response = await communityRequest(
    `/shows/${slug}/follow`,
    { method: value ? "PUT" : "DELETE" },
    true,
  ).catch(() => null);
  if (response?.status === 401) return { error: "Sign in to follow this production." };
  if (!response?.ok)
    return {
      error: response
        ? await message(response, "Could not update your follow.")
        : "Following is temporarily unavailable.",
    };
  revalidatePath(path);
  revalidatePath("/profile");
  return {};
}
