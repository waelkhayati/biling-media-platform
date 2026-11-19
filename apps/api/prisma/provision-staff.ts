import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  staffEmailSchema,
  staffProvisionPasswordMinLength,
  staffProvisionPasswordSchema,
  staffRoleSchema,
} from "@biling/schemas";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/admin/password";

async function provision() {
  const email = staffEmailSchema.safeParse(process.env.STAFF_EMAIL);
  const role = staffRoleSchema.safeParse(process.env.STAFF_ROLE ?? "ADMIN");
  const password = staffProvisionPasswordSchema.safeParse(process.env.STAFF_PASSWORD);
  delete process.env.STAFF_PASSWORD;
  if (!email.success || !role.success || !password.success) {
    throw new Error(
      `Provide STAFF_EMAIL, STAFF_PASSWORD (${staffProvisionPasswordMinLength}–128 characters), and optionally STAFF_ROLE.`,
    );
  }
  loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });
  delete process.env.STAFF_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Set DATABASE_URL before provisioning staff.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await prisma.staffAccount.create({
      data: { email: email.data, role: role.data, passwordHash: await hashPassword(password.data) },
    });
    process.stdout.write(`Created a staff account with role ${role.data}.\n`);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("That staff account already exists. Existing credentials were preserved.");
    }
    throw new Error(
      "Could not create the staff account. Check the database connection and staff migration.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

provision().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Staff provisioning failed."}\n`,
  );
  process.exitCode = 1;
});
