"use server";

import { redirect } from "next/navigation";
import {
  audienceEmailSchema,
  audienceLoginSchema,
  audienceProfileUpdateSchema,
  audienceRegisterSchema,
  audienceResetSchema,
  audienceSessionSchema,
  audienceVerifySchema,
} from "@biling/schemas";
import {
  audienceRequest,
  clearAudienceCookie,
  sameAudienceOrigin,
  writeAudienceCookie,
} from "@/lib/audience-api";

export type AudienceFormState = { error?: string; success?: string; verificationEmail?: string };
type State = AudienceFormState;
const originError = { error: "Open the account form from the configured Biling web address." };
const unavailable = {
  error: "Account services are temporarily unavailable. Try again in a moment.",
};

async function failure(response: Response): Promise<State> {
  const data = await response.json().catch(() => null);
  if (typeof data?.message === "string") return { error: data.message };
  if (
    Array.isArray(data?.message) &&
    data.message.every((item: unknown) => typeof item === "string")
  )
    return { error: data.message.join(" ") };
  return unavailable;
}

function submit(path: string, data: object, method = "POST", authenticate = false) {
  return audienceRequest(path, { method, body: JSON.stringify(data) }, authenticate);
}

export async function loginAudience(_previous: State, form: FormData): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  const input = audienceLoginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!input.success) return { error: "Enter your email and password." };
  try {
    const response = await submit("/login", input.data);
    if (response.status === 403) {
      return { ...(await failure(response)), verificationEmail: input.data.email };
    }
    if (!response.ok) return failure(response);
    await writeAudienceCookie(audienceSessionSchema.parse(await response.json()));
  } catch {
    return unavailable;
  }
  redirect("/profile");
}

export async function registerAudience(_previous: State, form: FormData): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  const input = audienceRegisterSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    username: form.get("username"),
    displayName: form.get("displayName"),
  });
  if (!input.success) return { error: input.error.issues.map((issue) => issue.message).join(" ") };
  try {
    const response = await submit("/register", input.data);
    if (!response.ok) return failure(response);
  } catch {
    return unavailable;
  }
  redirect("/login?registered=1");
}

async function sendAccountEmail(
  path: "/forgot-password" | "/resend-verification",
  form: FormData,
): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  const input = audienceEmailSchema.safeParse({ email: form.get("email") });
  if (!input.success) return { error: "Enter a valid email address." };
  try {
    const response = await submit(path, input.data);
    if (!response.ok) return failure(response);
    return {
      success:
        path === "/forgot-password"
          ? "If the account can be recovered, check your inbox for a password reset link."
          : "If the account needs verification, check your inbox for a new link.",
    };
  } catch {
    return unavailable;
  }
}

export async function forgotAudiencePassword(_previous: State, form: FormData) {
  return sendAccountEmail("/forgot-password", form);
}

export async function resendAudienceVerification(_previous: State, form: FormData) {
  return sendAccountEmail("/resend-verification", form);
}

async function redeem(path: "/reset-password" | "/verify-email", form: FormData): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  const reset = path === "/reset-password";
  const input = (reset ? audienceResetSchema : audienceVerifySchema).safeParse({
    token: String(form.get("token") ?? "").trim(),
    password: form.get("password"),
  });
  if (!input.success)
    return {
      error: reset
        ? "Enter a valid reset code and a password of 12 to 128 characters."
        : "Enter the verification code and your account password.",
    };
  if (reset && input.data.password !== form.get("confirmPassword"))
    return { error: "The passwords do not match." };
  try {
    const response = await submit(path, input.data);
    if (!response.ok) return failure(response);
  } catch {
    return unavailable;
  }
  redirect(reset ? "/login?reset=1" : "/login?verified=1");
}

export async function resetAudiencePassword(_previous: State, form: FormData) {
  return redeem("/reset-password", form);
}

export async function verifyAudienceEmail(_previous: State, form: FormData) {
  return redeem("/verify-email", form);
}

export async function updateAudienceProfile(_previous: State, form: FormData): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  const input = audienceProfileUpdateSchema.safeParse({
    displayName: form.get("displayName"),
    username: form.get("username"),
    biography: String(form.get("biography") ?? "").trim() || null,
    avatarUrl: String(form.get("avatarUrl") ?? "").trim() || null,
  });
  if (!input.success) return { error: input.error.issues.map((issue) => issue.message).join(" ") };
  try {
    const response = await submit("/me", input.data, "PATCH", true);
    if (!response.ok) return failure(response);
  } catch {
    return unavailable;
  }
  redirect("/profile?saved=1");
}

export async function logoutAudience(): Promise<State> {
  if (!(await sameAudienceOrigin())) return originError;
  try {
    const response = await audienceRequest("/logout", { method: "POST" }, true);
    if (!response.ok && response.status !== 401) return failure(response);
    await clearAudienceCookie();
  } catch {
    return unavailable;
  }
  redirect("/login?signedOut=1");
}
