import type { StaffInvitation, StaffInviteInput } from "@biling/contracts";
import type { Prisma } from "../generated/prisma/client";
import {
  hashStaffToken,
  lockActiveStaff,
  newStaffToken,
  pendingStaffPasswordHash,
} from "./staff-security";

export async function issueStaffInvitation(
  tx: Prisma.TransactionClient,
  { email, role }: StaffInviteInput,
  actor: { id?: string; email: string },
): Promise<StaffInvitation | null> {
  const account = await tx.staffAccount.upsert({
    where: { email },
    update: {},
    create: { email, role, passwordHash: pendingStaffPasswordHash },
    select: { id: true, active: true, authVersion: true, passwordHash: true, role: true },
  });
  if (
    !account.active ||
    account.passwordHash !== pendingStaffPasswordHash ||
    account.role !== role ||
    !(await lockActiveStaff(tx, account.id, account.authVersion))
  )
    return null;

  const code = newStaffToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await tx.staffChallenge.deleteMany({ where: { accountId: account.id, kind: "INVITE" } });
  await tx.staffChallenge.create({
    data: {
      tokenHash: hashStaffToken(code),
      accountId: account.id,
      kind: "INVITE",
      authVersion: account.authVersion,
      expiresAt,
    },
  });
  await tx.studioAuditEvent.create({
    data: {
      actorId: actor.id,
      actor: actor.email,
      resource: "STAFF",
      resourceId: account.id,
      title: email,
      action: "INVITE_CODE_ISSUED",
    },
  });
  return { email, role, code, expiresAt: expiresAt.toISOString() };
}
