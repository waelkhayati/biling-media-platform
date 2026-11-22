"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  articleBodyMaxBytes,
  articleInputSchema,
  articleUpdateSchema,
  studioArticleSchema,
  staffAccessActionSchema,
  staffChallengeSchema,
  staffContentIdSchema,
  staffInvitationSchema,
  staffInviteInputSchema,
  staffLoginSchema,
  staffOtpInputSchema,
  staffRecoveryInputSchema,
  staffSessionSchema,
  moderationActionSchema,
  communityIdSchema,
  gameInputSchema,
  gameUpdateSchema,
  studioGameSchema,
} from "@biling/schemas";
import type { StaffInvitation } from "@biling/contracts";
import {
  clearStudioSession,
  clearStudioChallenge,
  sameStudioOrigin,
  setStudioSession,
  setStudioChallenge,
  studioChallengeRequest,
  studioRequest,
} from "@/lib/studio-api";

type FormState = { error?: string };

async function apiMessage(response: Response, fallback: string) {
  if (![400, 401, 403, 404, 409, 429].includes(response.status)) return fallback;
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === "object" && "message" in data) {
    if (typeof data.message === "string") return data.message;
    if (
      Array.isArray(data.message) &&
      data.message.every((message) => typeof message === "string")
    ) {
      return data.message.join(" ");
    }
  }
  return fallback;
}

export async function signIn(_state: FormState, form: FormData): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Sign in from the configured Admin Studio address." };
  const input = staffLoginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    setupCode: nullable(form, "setupCode") ?? undefined,
  });
  if (!input.success) return { error: "Enter a valid email and password." };
  try {
    const response = await studioRequest(
      "/auth/login",
      { method: "POST", body: JSON.stringify(input.data) },
      false,
    );
    if (!response.ok)
      return { error: await apiMessage(response, "Sign-in is temporarily unavailable.") };
    const payload: unknown = await response.json();
    const localSession = staffSessionSchema.safeParse(payload);
    if (localSession.success) {
      await clearStudioChallenge();
      await setStudioSession(localSession.data.token, localSession.data.expiresAt);
      redirect("/admin");
    }
    const challenge = staffChallengeSchema.parse(payload);
    await setStudioChallenge(challenge.token, challenge.expiresAt);
  } catch {
    return { error: "Sign-in is temporarily unavailable. Try again." };
  }
  redirect("/admin/mfa");
}

export async function verifyStudioMfa(_state: FormState, form: FormData): Promise<FormState> {
  if (!(await sameStudioOrigin())) return { error: "Verify from the configured Studio address." };
  const input = staffOtpInputSchema.safeParse({ code: form.get("code") });
  if (!input.success) return { error: "Enter the six-digit authenticator code." };
  try {
    const response = await studioChallengeRequest("/auth/verify", {
      method: "POST",
      body: JSON.stringify(input.data),
    });
    if (!response.ok)
      return { error: await apiMessage(response, "Could not verify the authenticator code.") };
    const session = staffSessionSchema.parse(await response.json());
    await setStudioSession(session.token, session.expiresAt);
    await clearStudioChallenge();
  } catch {
    return { error: "Verification is temporarily unavailable. Try again." };
  }
  redirect("/admin");
}

async function startStudioEnrollment(
  path: "/auth/recover" | "/auth/signup",
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin())) return { error: "Continue from the configured Studio address." };
  const input = staffRecoveryInputSchema.safeParse({
    code: nullable(form, "code"),
    password: form.get("password"),
  });
  if (!input.success)
    return { error: "Enter your one-time code and a password of 8 to 128 characters." };
  if (input.data.password !== form.get("confirmPassword"))
    return { error: "The passwords do not match." };
  try {
    const response = await studioRequest(
      path,
      { method: "POST", body: JSON.stringify(input.data) },
      false,
    );
    if (!response.ok)
      return { error: await apiMessage(response, "Could not start account setup.") };
    const challenge = staffChallengeSchema.parse(await response.json());
    await clearStudioSession();
    await setStudioChallenge(challenge.token, challenge.expiresAt);
  } catch {
    return { error: "Account setup is temporarily unavailable. Try again." };
  }
  redirect("/admin/mfa");
}

export async function recoverStudioAccount(_state: FormState, form: FormData): Promise<FormState> {
  return startStudioEnrollment("/auth/recover", form);
}

export async function signUpStudioAccount(_state: FormState, form: FormData): Promise<FormState> {
  return startStudioEnrollment("/auth/signup", form);
}

export async function changeStudioAccess(
  id: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Update access from the configured Studio address." };
  const input = staffAccessActionSchema.safeParse({ action: form.get("action") });
  if (!input.success || !staffContentIdSchema.safeParse(id).success)
    return { error: "Invalid access request." };
  try {
    const response = await studioRequest(`/staff/${id}/access`, {
      method: "POST",
      body: JSON.stringify(input.data),
    });
    if (!response.ok)
      return { error: await apiMessage(response, "Could not update staff access.") };
  } catch {
    return {
      error:
        "Could not confirm the access change. Check the current account state before retrying.",
    };
  }
  revalidatePath("/admin/staff");
  redirect("/admin/staff?updated=1");
}

export async function inviteStudioStaff(
  _state: FormState & { invitation?: StaffInvitation },
  form: FormData,
): Promise<FormState & { invitation?: StaffInvitation }> {
  if (!(await sameStudioOrigin()))
    return { error: "Send invitations from the configured Studio address." };
  const input = staffInviteInputSchema.safeParse({
    email: form.get("email"),
    role: form.get("role"),
  });
  if (!input.success) return { error: "Enter a valid email and staff role." };
  let invitation: StaffInvitation;
  try {
    const response = await studioRequest("/staff/invitations", {
      method: "POST",
      body: JSON.stringify(input.data),
    });
    if (!response.ok)
      return { error: await apiMessage(response, "Could not create the invitation.") };
    invitation = staffInvitationSchema.parse(await response.json());
  } catch {
    return { error: "Could not confirm the invitation. Check the Staff list before trying again." };
  }
  revalidatePath("/admin/staff");
  return { invitation };
}

export async function signOut(): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Sign out from the configured Admin Studio address." };
  try {
    const response = await studioRequest("/auth/logout", { method: "POST" });
    if (!response.ok && response.status !== 401)
      return { error: "Could not revoke your session. Try again." };
    await clearStudioSession();
  } catch {
    return { error: "Could not revoke your session. Try again." };
  }
  redirect("/admin/login");
}

export async function moderateCommunityComment(
  id: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Moderate from the configured Admin Studio address." };
  const input = moderationActionSchema.safeParse({
    action: form.get("action"),
    note: nullable(form, "note"),
  });
  if (!input.success || !communityIdSchema.safeParse(id).success)
    return { error: "Invalid moderation request." };
  try {
    const response = await studioRequest(`/community/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input.data),
    });
    if (!response.ok)
      return { error: await apiMessage(response, "Could not apply the moderation action.") };
  } catch {
    return { error: "Could not confirm the moderation action." };
  }
  revalidatePath("/admin/community");
  return {};
}

function nullable(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() || null : null;
}

function numberField(form: FormData, name: string) {
  const value = nullable(form, name);
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : value;
}

function contentInput(kind: "shows" | "episodes", form: FormData) {
  const fields = {
    title: form.get("title"),
    slug: form.get("slug"),
    description: nullable(form, "description"),
    status: form.get("status"),
  };
  if (kind === "shows")
    return {
      ...fields,
      featured: form.get("featured") === "on",
      posterUrl: nullable(form, "posterUrl"),
      genre: nullable(form, "genre"),
      releaseYear: numberField(form, "releaseYear"),
      trailerYoutubeVideoId: nullable(form, "trailerYoutubeVideoId"),
    };
  const date = nullable(form, "publishedAt");
  return {
    ...fields,
    showId: form.get("showId"),
    youtubeVideoId: nullable(form, "youtubeVideoId"),
    durationSeconds: numberField(form, "durationSeconds"),
    episodeNumber: numberField(form, "episodeNumber"),
    publishedAt: date && `${date}${date.length === 16 ? ":00" : ""}Z`,
  };
}

export async function saveStudioContent(
  kind: "shows" | "episodes",
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Save from the configured Admin Studio address." };
  if (!["shows", "episodes"].includes(kind) || (id !== null && !/^[A-Za-z0-9_-]{1,80}$/.test(id))) {
    return { error: "Invalid content request." };
  }

  const body = { ...contentInput(kind, form), ...(id ? { revision: form.get("revision") } : {}) };
  let savedId: string;
  try {
    const response = await studioRequest(id ? `/${kind}/${id}` : `/${kind}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    if (!response.ok)
      return { error: await apiMessage(response, "Could not save this record. Try again.") };
    const saved = await response.json();
    if (!saved || typeof saved.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(saved.id)) {
      return {
        error: "The API returned an invalid save result. Check the content list before retrying.",
      };
    }
    savedId = saved.id;
  } catch {
    return { error: "Could not confirm the save. Check the content list before retrying." };
  }
  revalidatePath(`/admin/${kind}/${savedId}`);
  redirect(`/admin/${kind}/${savedId}?saved=1`);
}

export async function saveStudioArticle(
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin()))
    return { error: "Save from the configured Admin Studio address." };
  if (id && !staffContentIdSchema.safeParse(id).success) return { error: "Invalid article." };
  const rawBody = form.get("body");
  if (typeof rawBody !== "string" || new TextEncoder().encode(rawBody).length > articleBodyMaxBytes)
    return { error: "The article body is too long." };
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { error: "The article body is invalid." };
  }
  const fields = {
    title: form.get("title"),
    slug: form.get("slug"),
    excerpt: nullable(form, "excerpt"),
    author: form.get("author"),
    category: form.get("category"),
    language: form.get("language"),
    tags:
      nullable(form, "tags")
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean) ?? [],
    imageUrl: nullable(form, "imageUrl"),
    imageAlt: nullable(form, "imageAlt"),
    imageCaption: nullable(form, "imageCaption"),
    imageCredit: nullable(form, "imageCredit"),
    featured: form.get("featured") === "on",
    seoTitle: nullable(form, "seoTitle"),
    seoDescription: nullable(form, "seoDescription"),
    body,
    status: form.get("status"),
    showIds: form.getAll("showIds"),
    episodeIds: form.getAll("episodeIds"),
  };
  const input = id
    ? articleUpdateSchema.safeParse({ ...fields, revision: form.get("revision") })
    : articleInputSchema.safeParse(fields);
  if (!input.success)
    return {
      error: input.error.issues
        .map((issue) => issue.path.join(".") + ": " + issue.message)
        .join(" "),
    };
  let savedId: string;
  try {
    const response = await studioRequest(id ? "/articles/" + id : "/articles", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(input.data),
    });
    if (response.status === 401) savedId = "";
    else {
      if (!response.ok) return { error: await apiMessage(response, "Could not save the article.") };
      savedId = studioArticleSchema.parse(await response.json()).id;
    }
  } catch {
    return { error: "Could not confirm the save. Check the article list before retrying." };
  }
  if (!savedId) redirect("/admin/login");
  revalidatePath("/admin/articles");
  redirect("/admin/articles/" + savedId + "?saved=1");
}

export async function saveStudioGame(
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await sameStudioOrigin())) return { error: "Save from the configured Admin Studio address." };
  if (id && !staffContentIdSchema.safeParse(id).success) return { error: "Invalid game." };
  let questions: unknown;
  let outcomes: unknown;
  try {
    questions = JSON.parse(String(form.get("questions") ?? ""));
    outcomes = JSON.parse(String(form.get("outcomes") ?? ""));
  } catch {
    return { error: "Questions and outcomes must contain valid JSON." };
  }
  const utcDate = (name: string) => {
    const value = nullable(form, name);
    return value ? `${value}${value.length === 16 ? ":00" : ""}Z` : null;
  };
  const input = {
    title: form.get("title"), slug: form.get("slug"), description: nullable(form, "description"),
    artworkUrl: nullable(form, "artworkUrl"), type: form.get("type"), featured: form.get("featured") === "on",
    status: form.get("status"), availableFrom: utcDate("availableFrom"), availableUntil: utcDate("availableUntil"),
    timeLimitSeconds: numberField(form, "timeLimitSeconds"), questions, outcomes,
  };
  const parsed = id ? gameUpdateSchema.safeParse({ ...input, revision: form.get("revision") }) : gameInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" ") };
  try {
    const response = await studioRequest(id ? "/games/" + id : "/games", { method: id ? "PATCH" : "POST", body: JSON.stringify(parsed.data) });
    if (!response.ok) return { error: await apiMessage(response, "Could not save the game.") };
    const saved = studioGameSchema.parse(await response.json());
    revalidatePath("/admin/games");
    revalidatePath("/games");
    redirect(`/admin/games/${saved.id}?saved=1`);
  } catch {
    return { error: "Could not confirm the save. Check the games list before retrying." };
  }
}
