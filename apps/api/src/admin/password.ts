import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

async function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, scryptOptions, (error, hash) => {
      if (error) reject(error);
      else resolve(hash);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = await derivePassword(password, salt);
  return ["scrypt-v1", salt.toString("base64url"), digest.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
  const [version, salt, digest, extra] = stored?.split("$") ?? [];
  const validHash =
    version === "scrypt-v1" &&
    !extra &&
    !!salt?.match(/^[A-Za-z0-9_-]{22}$/) &&
    !!digest?.match(/^[A-Za-z0-9_-]{43}$/);
  const actual = await derivePassword(
    password,
    validHash ? Buffer.from(salt, "base64url") : Buffer.alloc(16),
  );
  const matches = timingSafeEqual(
    actual,
    validHash ? Buffer.from(digest, "base64url") : Buffer.alloc(32),
  );
  return validHash && matches;
}
