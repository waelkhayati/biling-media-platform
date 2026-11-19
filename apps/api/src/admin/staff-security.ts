import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import type { Prisma } from "../generated/prisma/client";

export const staffIdentity = { id: true, email: true, role: true } as const;
export const pendingStaffPasswordHash = "";

export function hashStaffToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newStaffToken() {
  return randomBytes(32).toString("base64url");
}

export function bearerToken(header?: string) {
  return /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(header ?? "")?.[1];
}

function mfaKey() {
  const configured = process.env.STAFF_MFA_KEY ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(configured)) {
    throw new Error("STAFF_MFA_KEY must be a persistent 32-byte base64url secret.");
  }
  return Buffer.from(configured, "base64url");
}

export function newMfaSecret(accountId: string) {
  const seed = new Secret({ size: 20 }).base32;
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", mfaKey(), nonce);
  cipher.setAAD(Buffer.from(accountId));
  const ciphertext = Buffer.concat([cipher.update(seed, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function readMfaSecret(accountId: string, encrypted: string) {
  const [nonce, tag, bytes] = encrypted.split(".").map((part) => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", mfaKey(), nonce);
  cipher.setAAD(Buffer.from(accountId));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(bytes), cipher.final()]).toString("utf8");
}

function totpTimestamp() {
  const raw = process.env.STAFF_TOTP_LOCAL_CLOCK_OFFSET_SECONDS;
  if (raw === undefined) return Date.now();
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const offset = Number(raw);
  if (
    !URL.canParse(databaseUrl) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname) ||
    !/^-?\d{1,3}$/.test(raw) ||
    Math.abs(offset) > 300
  ) {
    throw new Error("The TOTP clock offset is limited to ±300 seconds with a local database.");
  }
  return Date.now() + offset * 1000;
}

export function verifiedTotpStep(seed: string, code: string, timestamp = totpTimestamp()) {
  const period = 30;
  const otp = new TOTP({ secret: Secret.fromBase32(seed), algorithm: "SHA1", digits: 6, period });
  const delta = otp.validate({ token: code, timestamp, window: 1 });
  return delta === null ? null : Math.floor(timestamp / (period * 1000)) + delta;
}

export async function lockActiveStaff(
  tx: Prisma.TransactionClient,
  id: string,
  authVersion: number,
) {
  const locked = await tx.staffAccount.updateMany({
    where: { id, active: true, authVersion },
    data: { authVersion: { increment: 0 } },
  });
  return locked.count === 1;
}

export async function clearStaffCredentials(tx: Prisma.TransactionClient, accountId: string) {
  await tx.staffSession.deleteMany({ where: { accountId } });
  await tx.staffChallenge.deleteMany({ where: { accountId } });
}
