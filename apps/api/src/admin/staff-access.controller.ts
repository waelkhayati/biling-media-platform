import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { StaffAccessRow, StudioAuditRow, StudioList } from "@biling/contracts";
import {
  staffAccessActionSchema,
  staffAuditQuerySchema,
  staffContentIdSchema,
} from "@biling/schemas";
import { PrismaService } from "../database/prisma.service";
import { clearStaffCredentials } from "./staff-security";
import { StaffGuard, type StaffRequest } from "./staff.guard";

function requireAdmin(request: StaffRequest) {
  if (request.staff.role !== "ADMIN")
    throw new ForbiddenException("Administrator access required.");
}

@ApiTags("Staff access and audit")
@ApiBearerAuth("staff")
@UseGuards(StaffGuard)
@Controller("admin")
export class StaffAccessController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("staff")
  @ApiOperation({ summary: "List staff access states for administrators" })
  async staff(@Req() request: StaffRequest): Promise<StaffAccessRow[]> {
    requireAdmin(request);
    const accounts = await this.prisma.staffAccount.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true, active: true, mfaSecret: true },
    });
    return accounts.map(({ mfaSecret, ...row }) => ({ ...row, enrolled: mfaSecret !== null }));
  }

  @Post("staff/:id/access")
  @HttpCode(204)
  @ApiOperation({ summary: "Suspend, restore, or revoke all credentials for a staff account" })
  async changeAccess(@Req() request: StaffRequest, @Param("id") id: string, @Body() body: unknown) {
    requireAdmin(request);
    const input = staffAccessActionSchema.safeParse(body);
    if (!input.success || !staffContentIdSchema.safeParse(id).success)
      throw new BadRequestException("Invalid staff access request.");
    const { action } = input.data;
    if (id === request.staff.id && action === "DISABLE")
      throw new ConflictException("You cannot suspend your own account.");

    await this.prisma.$transaction(async (tx) => {
      // Serialize administrator access changes, including the last-admin check.
      await tx.$queryRaw`SELECT "id" FROM "StaffAccount" WHERE "role" = 'ADMIN' ORDER BY "id" FOR UPDATE`;
      const actor = await tx.staffAccount.findUnique({
        where: { id: request.staff.id, active: true, role: "ADMIN" },
        select: { id: true },
      });
      if (!actor) throw new ForbiddenException("Administrator access required.");
      const target = await tx.staffAccount.findUnique({
        where: { id },
        select: { email: true, role: true, active: true },
      });
      if (!target) throw new NotFoundException("Staff account not found.");
      if (
        action === "DISABLE" &&
        target.role === "ADMIN" &&
        target.active &&
        (await tx.staffAccount.count({ where: { role: "ADMIN", active: true } })) <= 1
      ) {
        throw new ConflictException("Keep at least one administrator active.");
      }

      await tx.staffAccount.update({
        where: { id },
        data: {
          authVersion: { increment: 1 },
          active: action === "REVOKE" ? undefined : action === "ENABLE",
        },
      });
      await clearStaffCredentials(tx, id);
      await tx.studioAuditEvent.create({
        data: {
          actorId: request.staff.id,
          actor: request.staff.email,
          resource: "STAFF",
          resourceId: id,
          title: target.email,
          action:
            action === "DISABLE"
              ? "SUSPENDED"
              : action === "ENABLE"
                ? "RESTORED"
                : "SESSIONS_REVOKED",
        },
      });
    });
  }

  @Get("audit")
  @ApiOperation({ summary: "Read paginated editorial and authorized staff activity" })
  async audit(
    @Req() request: StaffRequest,
    @Query() query: unknown,
  ): Promise<StudioList<StudioAuditRow>> {
    const result = staffAuditQuerySchema.safeParse(query);
    if (!result.success) throw new BadRequestException("Invalid activity filter.");
    const { kind, page } = result.data;
    if (kind === "STAFF") requireAdmin(request);
    const resource =
      kind ?? (request.staff.role === "ADMIN" ? undefined : { in: ["SHOW", "EPISODE", "ARTICLE"] });
    const rows = await this.prisma.studioAuditEvent.findMany({
      where: { resource },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 50,
      take: 51,
      select: {
        id: true,
        actor: true,
        resource: true,
        resourceId: true,
        title: true,
        action: true,
        previousStatus: true,
        nextStatus: true,
        createdAt: true,
      },
    });
    return {
      items: rows.slice(0, 50).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      page,
      hasMore: rows.length > 50,
    };
  }
}
