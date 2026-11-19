import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { staffEmailSchema, staffRoleSchema } from "@biling/schemas";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  hashStaffToken,
  lockActiveStaff,
  newStaffToken,
  pendingStaffPasswordHash,
} from "../src/admin/staff-security";

async function issue() {
  const email = staffEmailSchema.safeParse(process.env.STAFF_EMAIL);
  const kind = process.env.STAFF_CODE_PURPOSE ?? "SETUP";
  const role = staffRoleSchema.safeParse(process.env.STAFF_ROLE ?? "EDITOR");
  if (
    !email.success ||
    !role.success ||
    (kind !== "SETUP" && kind !== "RECOVERY" && kind !== "INVITE")
  ) {
    throw new Error(
      "Provide STAFF_EMAIL, a STAFF_CODE_PURPOSE of INVITE, SETUP or RECOVERY, and optionally STAFF_ROLE.",
    );
  }
  loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Set DATABASE_URL for the intended Studio database.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const token = newStaffToken();
    const created = await prisma.$transaction(async (tx) => {
      const select = { id: true, active: true, authVersion: true } as const;
      const account =
        kind === "INVITE"
          ? await tx.staffAccount.upsert({
              where: { email: email.data },
              update: {},
              create: {
                email: email.data,
                role: role.data,
                passwordHash: pendingStaffPasswordHash,
              },
              select,
            })
          : await tx.staffAccount.findUnique({ where: { email: email.data }, select });
      if (!account?.active || !(await lockActiveStaff(tx, account.id, account.authVersion)))
        return false;
      const current = await tx.staffAccount.findUniqueOrThrow({
        where: { id: account.id },
        select: { mfaSecret: true, passwordHash: true, role: true },
      });
      const isPending = current.passwordHash === pendingStaffPasswordHash;
      if (isPending !== (kind === "INVITE") || (kind === "INVITE" && current.role !== role.data))
        return false;
      if (kind === "SETUP" && current.mfaSecret) return false;
      await tx.staffChallenge.deleteMany({
        where: {
          accountId: account.id,
          kind: kind === "SETUP" ? { in: ["SETUP", "ENROLL"] } : kind,
        },
      });
      await tx.staffChallenge.create({
        data: {
          tokenHash: hashStaffToken(token),
          accountId: account.id,
          kind,
          authVersion: account.authVersion,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      await tx.studioAuditEvent.create({
        data: {
          actor: "Operator CLI",
          resource: "STAFF",
          resourceId: account.id,
          title: email.data,
          action: `${kind}_CODE_ISSUED`,
        },
      });
      return true;
    });
    if (!created)
      return "Code unavailable. Check that the account is active and eligible for the selected purpose.";
    process.stdout.write(`One-time ${kind.toLowerCase()} code (15 minutes): ${token}\n`);
  } catch {
    throw new Error("Could not issue a staff code. Check the database connection and migration.");
  } finally {
    await prisma.$disconnect();
  }
}

issue()
  .then((message) => {
    if (message) {
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Staff code issuance failed."}\n`,
    );
    process.exitCode = 1;
  });
