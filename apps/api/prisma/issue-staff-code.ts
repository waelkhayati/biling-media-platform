import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { staffEmailSchema, staffRoleSchema } from "@biling/schemas";
import { PrismaClient } from "../src/generated/prisma/client";
import { issueStaffInvitation } from "../src/admin/staff-invitation";
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
      if (kind === "INVITE") {
        return issueStaffInvitation(
          tx,
          { email: email.data, role: role.data },
          { email: "Operator CLI" },
        );
      }
      const select = { id: true, active: true, authVersion: true } as const;
      const account = await tx.staffAccount.findUnique({ where: { email: email.data }, select });
      if (!account?.active || !(await lockActiveStaff(tx, account.id, account.authVersion)))
        return false;
      const current = await tx.staffAccount.findUniqueOrThrow({
        where: { id: account.id },
        select: { mfaSecret: true, passwordHash: true },
      });
      const isPending = current.passwordHash === pendingStaffPasswordHash;
      if (isPending) return false;
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
    const code = typeof created === "object" ? created.code : token;
    process.stdout.write(`One-time ${kind.toLowerCase()} code (15 minutes): ${code}\n`);
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
