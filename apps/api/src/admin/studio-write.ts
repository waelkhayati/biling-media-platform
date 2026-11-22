import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { StaffIdentity, StaffRole } from "@biling/contracts";
import type { PrismaService } from "../database/prisma.service";
import type { Prisma, Show } from "../generated/prisma/client";

export function authorizeStatus(role: StaffRole, next: Show["status"], current?: Show["status"]) {
  if (role !== "ADMIN" && (next === "ARCHIVED" || current === "ARCHIVED")) {
    throw new ForbiddenException("Only an administrator can archive or change archived content.");
  }
}

async function save<T>(resource: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "P2002")
      throw new ConflictException(
        resource === "ARTICLE"
          ? "That article slug is already in use."
          : "That slug or YouTube video ID is already in use.",
      );
    if (code === "P2025")
      throw new ConflictException(
        "Someone changed this record. Reload the current version before saving.",
      );
    if (code === "P2003") throw new BadRequestException("Choose existing related content.");
    throw error;
  }
}

export async function writeStudioChange<
  T extends { id: string; title: string; status: Show["status"] },
>(
  prisma: PrismaService,
  actor: StaffIdentity,
  resource: "SHOW" | "EPISODE" | "ARTICLE" | "GAME",
  previousStatus: Show["status"] | null,
  mutation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return save(resource, () =>
    prisma.$transaction(async (tx) => {
      const row = await mutation(tx);
      let action = "UPDATED";
      if (previousStatus === null) action = "CREATED";
      else if (previousStatus !== row.status) {
        if (row.status === "ARCHIVED") action = "ARCHIVED";
        else if (previousStatus === "ARCHIVED") action = "RESTORED";
        else if (row.status === "PUBLISHED") action = "PUBLISHED";
        else action = "UNPUBLISHED";
      }
      await tx.studioAuditEvent.create({
        data: {
          actorId: actor.id,
          actor: actor.email,
          resource,
          resourceId: row.id,
          title: row.title,
          action,
          previousStatus,
          nextStatus: row.status,
        },
      });
      return row;
    }),
  );
}
