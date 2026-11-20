import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { StaffIdentity } from "@biling/contracts";
import { siteUrl } from "./content-metadata";

function studioOrigin() {
  const defaultOrigin =
    process.env.VERCEL_ENV === "production" ? siteUrl().origin : "http://127.0.0.1:3000";
  const url = new URL(process.env.ADMIN_WEB_ORIGIN ?? defaultOrigin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.origin !== url.href.replace(/\/$/, "")
  ) {
    throw new Error("ADMIN_WEB_ORIGIN must be an HTTPS origin or a local HTTP origin.");
  }
  return url;
}

function cookieSettings(kind = "staff") {
  const secure = studioOrigin().protocol === "https:";
  return {
    name: `${secure ? "__Host-" : ""}biling-${kind}`,
    options: { secure, httpOnly: true, sameSite: "strict", path: "/" } as const,
  };
}

export async function sameStudioOrigin() {
  const origin = (await headers()).get("origin");
  if (origin === studioOrigin().origin) return true;

  // Local preview ports change often (for example 3000, 3100, or 3102). Keep the
  // production allow-list exact, while allowing only loopback HTTP origins during
  // development so a local Studio cannot be blocked by its port number.
  if (process.env.NODE_ENV === "production" || !origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function setStudioSession(token: string, expiresAt: string) {
  const { name, options } = cookieSettings();
  (await cookies()).set(name, token, { ...options, expires: new Date(expiresAt) });
}

export async function clearStudioSession() {
  const { name, options } = cookieSettings();
  (await cookies()).set(name, "", { ...options, maxAge: 0 });
}

export async function setStudioChallenge(token: string, expiresAt: string) {
  const { name, options } = cookieSettings("challenge");
  (await cookies()).set(name, token, { ...options, expires: new Date(expiresAt) });
}

export async function clearStudioChallenge() {
  const { name, options } = cookieSettings("challenge");
  (await cookies()).set(name, "", { ...options, maxAge: 0 });
}

export async function studioChallengeRequest(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(cookieSettings("challenge").name)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response(null, { status: 401 });
  return studioRequest(path, { ...init, headers: { Authorization: `Bearer ${token}` } }, false);
}

async function sessionToken() {
  const token = (await cookies()).get(cookieSettings().name)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

export async function studioRequest(path: string, init: RequestInit = {}, authenticate = true) {
  const base = new URL(process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api/v1");
  if (
    base.protocol !== "https:" &&
    !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  ) {
    throw new Error("The staff API requires HTTPS outside localhost.");
  }
  const requestHeaders = new Headers(init.headers);
  if (init.body) requestHeaders.set("Content-Type", "application/json");
  if (authenticate) {
    const token = await sessionToken();
    if (!token) return new Response(null, { status: 401 });
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${base.href.replace(/\/$/, "")}/admin${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
}

export const getStudioAccount = cache(async (): Promise<StaffIdentity | null> => {
  const response = await studioRequest("/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Staff session check failed.");
  return response.json();
});

export async function requireStudioAccount() {
  const account = await getStudioAccount();
  if (!account) redirect("/admin/login");
  return account;
}

export async function readStudio<T>(path: string): Promise<T> {
  const response = await studioRequest(path);
  if (response.status === 401) redirect("/admin/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Admin Studio request failed.");
  return response.json();
}
