import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  audienceCapabilitiesSchema,
  audienceProfileSchema,
  audienceTokenSchema,
} from "@biling/schemas";
import type { AudienceSession } from "@biling/contracts";
import { siteUrl } from "./content-metadata";

const loopback = ["localhost", "127.0.0.1", "[::1]"];

function settings() {
  const defaultOrigin =
    process.env.VERCEL_ENV === "production" ? siteUrl().origin : "http://127.0.0.1:3000";
  const url = new URL(process.env.AUDIENCE_WEB_ORIGIN ?? defaultOrigin);
  const secure = url.protocol === "https:";
  if (
    url.href !== url.origin + "/" ||
    (!secure && !(url.protocol === "http:" && loopback.includes(url.hostname)))
  )
    throw new Error("AUDIENCE_WEB_ORIGIN must be an HTTPS origin or a loopback HTTP origin.");
  return {
    origin: url.origin,
    cookie: (secure ? "__Host-" : "") + "biling-audience",
    options: { secure, httpOnly: true, sameSite: "lax", path: "/" } as const,
  };
}

export async function sameAudienceOrigin() {
  return (await headers()).get("origin") === settings().origin;
}

export async function writeAudienceCookie(session: AudienceSession) {
  const { cookie, options } = settings();
  (await cookies()).set(cookie, session.token, {
    ...options,
    expires: new Date(session.expiresAt),
  });
}

export async function clearAudienceCookie() {
  const { cookie, options } = settings();
  (await cookies()).set(cookie, "", { ...options, maxAge: 0 });
}

export async function audienceRequest(path: string, init: RequestInit = {}, authenticated = false) {
  const base = new URL(process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api/v1");
  if (
    base.protocol !== "https:" &&
    !(base.protocol === "http:" && loopback.includes(base.hostname))
  )
    throw new Error("The accounts API requires HTTPS outside loopback.");
  const requestHeaders = new Headers(init.headers);
  if (init.body) requestHeaders.set("Content-Type", "application/json");
  if (authenticated) {
    const token = audienceTokenSchema.safeParse((await cookies()).get(settings().cookie)?.value);
    if (!token.success) return new Response(null, { status: 401 });
    requestHeaders.set("Authorization", "Bearer " + token.data);
  }
  return fetch(base.href.replace(/\/$/, "") + "/audience" + path, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}

export async function communityRequest(
  path: string,
  init: RequestInit = {},
  authenticated = false,
) {
  const base = new URL(process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api/v1");
  if (
    base.protocol !== "https:" &&
    !(base.protocol === "http:" && loopback.includes(base.hostname))
  )
    throw new Error("The community API requires HTTPS outside loopback.");
  const requestHeaders = new Headers(init.headers);
  if (init.body) requestHeaders.set("Content-Type", "application/json");
  if (authenticated) {
    const token = audienceTokenSchema.safeParse((await cookies()).get(settings().cookie)?.value);
    if (!token.success) return new Response(null, { status: 401 });
    requestHeaders.set("Authorization", "Bearer " + token.data);
  }
  return fetch(base.href.replace(/\/$/, "") + "/community" + path, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}

export async function gamesRequest(path: string, init: RequestInit = {}) {
  const base = new URL(process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api/v1");
  const requestHeaders = new Headers(init.headers);
  if (init.body) requestHeaders.set("Content-Type", "application/json");
  const token = audienceTokenSchema.safeParse((await cookies()).get(settings().cookie)?.value);
  if (token.success) requestHeaders.set("Authorization", "Bearer " + token.data);
  return fetch(base.href.replace(/\/$/, "") + "/games" + path, {
    ...init, headers: requestHeaders, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
  });
}

export const getAudienceProfile = cache(async () => {
  const response = await audienceRequest("/me", {}, true);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load the audience profile.");
  return audienceProfileSchema.parse(await response.json());
});

export async function requireAudienceProfile() {
  const profile = await getAudienceProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function getAudienceCapabilities() {
  const unavailable = { emailAvailable: false, registration: "unavailable" as const };
  try {
    const response = await audienceRequest("/capabilities");
    return response.ok ? audienceCapabilitiesSchema.parse(await response.json()) : unavailable;
  } catch {
    return unavailable;
  }
}
