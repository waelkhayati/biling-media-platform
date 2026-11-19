import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  StaffChallengeResult,
  StaffIdentity,
  StaffLogin,
  StaffRecoveryInput,
  StaffSession,
} from "@biling/contracts";
import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";
import { hashPassword, verifyPassword } from "./password";
import {
  clearStaffCredentials,
  hashStaffToken,
  lockActiveStaff,
  newMfaSecret,
  newStaffToken,
  pendingStaffPasswordHash,
  readMfaSecret,
  staffIdentity,
  verifiedTotpStep,
} from "./staff-security";

const sessionLifetime = 8 * 60 * 60 * 1000;
const challengeKinds = { in: ["ENROLL", "MFA"] as ("ENROLL" | "MFA")[] };
const invalidChallenge = () =>
  new UnauthorizedException("The code or sign-in request is invalid or expired.");

@Injectable()
export class StaffAuthService {
  private nextCleanup = 0;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(input: StaffLogin, ip: string): Promise<StaffChallengeResult> {
    await this.consumeAttempt(hashStaffToken(`ip:${ip}`), 60);
    await this.consumeAttempt(hashStaffToken(`account:${input.email}`), 8);
    const account = await this.prisma.staffAccount.findUnique({
      where: { email: input.email },
      select: {
        ...staffIdentity,
        active: true,
        passwordHash: true,
        authVersion: true,
        mfaSecret: true,
      },
    });
    const matches = await verifyPassword(input.password, account?.passwordHash);
    if (!account?.active || !matches) throw new UnauthorizedException("Invalid email or password.");

    return this.prisma.$transaction(async (tx) => {
      if (!(await lockActiveStaff(tx, account.id, account.authVersion))) throw invalidChallenge();
      const current = await tx.staffAccount.findUniqueOrThrow({
        where: { id: account.id },
        select: { mfaSecret: true },
      });
      const kind = current.mfaSecret ? "MFA" : "ENROLL";
      if (kind === "ENROLL") {
        const setup =
          input.setupCode &&
          (await tx.staffChallenge.deleteMany({
            where: {
              tokenHash: hashStaffToken(input.setupCode),
              accountId: account.id,
              kind: "SETUP",
              authVersion: account.authVersion,
              expiresAt: { gt: new Date() },
            },
          }));
        if (!setup || setup.count !== 1) {
          throw new UnauthorizedException(
            "Enter the one-time setup code from your Studio operator.",
          );
        }
      }
      return this.issueChallenge(tx, account.id, account.authVersion, kind);
    });
  }

  private async issueChallenge(
    tx: Prisma.TransactionClient,
    accountId: string,
    authVersion: number,
    kind: "ENROLL" | "MFA",
  ): Promise<StaffChallengeResult> {
    const token = newStaffToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await tx.staffChallenge.deleteMany({ where: { accountId, kind: challengeKinds } });
    await tx.staffChallenge.create({
      data: {
        tokenHash: hashStaffToken(token),
        accountId,
        authVersion,
        kind,
        expiresAt,
        secret: kind === "ENROLL" ? newMfaSecret(accountId) : null,
      },
    });
    return { token, expiresAt: expiresAt.toISOString(), kind };
  }

  async challenge(token: string) {
    const challenge = await this.prisma.staffChallenge.findUnique({
      where: {
        tokenHash: hashStaffToken(token),
        kind: challengeKinds,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
        account: { active: true },
      },
      include: { account: { select: { authVersion: true, email: true } } },
    });
    if (!challenge || challenge.authVersion !== challenge.account.authVersion)
      throw invalidChallenge();
    return {
      kind: challenge.kind,
      email: challenge.account.email,
      manualKey: challenge.secret ? readMfaSecret(challenge.accountId, challenge.secret) : null,
    };
  }

  async verifyChallenge(token: string, code: string): Promise<StaffSession> {
    const tokenHash = hashStaffToken(token);
    const result = await this.prisma.$transaction(async (tx) => {
      const pending = await tx.staffChallenge.findUnique({
        where: {
          tokenHash,
          kind: challengeKinds,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        select: { accountId: true, authVersion: true },
      });
      if (!pending || !(await lockActiveStaff(tx, pending.accountId, pending.authVersion)))
        return null;

      const challenge = await tx.staffChallenge.findUnique({
        where: { tokenHash, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
        include: { account: { select: { ...staffIdentity, mfaSecret: true, lastTotpStep: true } } },
      });
      if (!challenge) return null;
      const { account } = challenge;
      const enrolling = challenge.kind === "ENROLL";
      const encrypted = enrolling ? challenge.secret : account.mfaSecret;
      if (!encrypted || (enrolling && account.mfaSecret)) return null;
      const step = verifiedTotpStep(readMfaSecret(account.id, encrypted), code);
      if (step === null || step <= (account.lastTotpStep ?? -1)) {
        await tx.staffChallenge.update({
          where: { tokenHash },
          data: { attempts: { increment: 1 } },
        });
        return null;
      }

      await tx.staffAccount.update({
        where: { id: account.id },
        data: { mfaSecret: encrypted, lastTotpStep: step },
      });
      await tx.staffChallenge.delete({ where: { tokenHash } });
      if (enrolling)
        await tx.studioAuditEvent.create({
          data: {
            actorId: account.id,
            actor: account.email,
            resource: "STAFF",
            resourceId: account.id,
            title: account.email,
            action: "MFA_ENROLLED",
          },
        });
      return this.issueSession(tx, account, challenge.authVersion);
    });
    if (!result) throw invalidChallenge();
    return result;
  }

  private async issueSession(
    tx: Prisma.TransactionClient,
    { id, email, role }: StaffIdentity,
    authVersion: number,
  ): Promise<StaffSession> {
    const token = newStaffToken();
    const expiresAt = new Date(Date.now() + sessionLifetime);
    await tx.staffSession.create({
      data: { tokenHash: hashStaffToken(token), accountId: id, expiresAt, authVersion },
    });
    return { token, expiresAt: expiresAt.toISOString(), account: { id, email, role } };
  }

  async redeemEnrollment(
    input: StaffRecoveryInput,
    ip: string,
    kind: "RECOVERY" | "INVITE",
  ): Promise<StaffChallengeResult> {
    await this.consumeAttempt(hashStaffToken(`enrollment-ip:${ip}`), 20);
    const tokenHash = hashStaffToken(input.code);
    const pending = await this.prisma.staffChallenge.findUnique({
      where: {
        tokenHash,
        kind,
        expiresAt: { gt: new Date() },
        account: {
          active: true,
          passwordHash:
            kind === "INVITE" ? pendingStaffPasswordHash : { not: pendingStaffPasswordHash },
        },
      },
      select: { accountId: true, authVersion: true, account: { select: { email: true } } },
    });
    if (!pending) throw invalidChallenge();
    const passwordHash = await hashPassword(input.password);
    return this.prisma.$transaction(async (tx) => {
      if (!(await lockActiveStaff(tx, pending.accountId, pending.authVersion)))
        throw invalidChallenge();
      const used = await tx.staffChallenge.deleteMany({
        where: { tokenHash, kind, expiresAt: { gt: new Date() } },
      });
      if (used.count !== 1) throw invalidChallenge();
      const account = await tx.staffAccount.update({
        where: { id: pending.accountId },
        data: { passwordHash, mfaSecret: null, lastTotpStep: null, authVersion: { increment: 1 } },
      });
      await clearStaffCredentials(tx, account.id);
      await tx.studioAuditEvent.create({
        data: {
          actorId: account.id,
          actor: pending.account.email,
          resource: "STAFF",
          resourceId: account.id,
          title: pending.account.email,
          action: kind === "INVITE" ? "INVITE_ACCEPTED" : "RECOVERED",
        },
      });
      return this.issueChallenge(tx, account.id, account.authVersion, "ENROLL");
    });
  }

  async authenticate(token: string): Promise<StaffIdentity> {
    const session = await this.prisma.staffSession.findUnique({
      where: {
        tokenHash: hashStaffToken(token),
        expiresAt: { gt: new Date() },
        account: { active: true, mfaSecret: { not: null } },
      },
      select: { authVersion: true, account: { select: { ...staffIdentity, authVersion: true } } },
    });
    if (!session || session.authVersion !== session.account.authVersion)
      throw new UnauthorizedException("Your session has expired. Sign in again.");
    const { id, email, role } = session.account;
    return { id, email, role };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.staffSession.deleteMany({ where: { tokenHash: hashStaffToken(token) } });
  }

  private async consumeAttempt(key: string, limit: number) {
    const now = Date.now();
    if (now >= this.nextCleanup) {
      this.nextCleanup = now + 5 * 60 * 1000;
      await Promise.all([
        this.prisma.staffLoginThrottle.deleteMany({
          where: { windowEndsAt: { lte: new Date(now) } },
        }),
        this.prisma.staffSession.deleteMany({ where: { expiresAt: { lte: new Date(now) } } }),
        this.prisma.staffChallenge.deleteMany({ where: { expiresAt: { lte: new Date(now) } } }),
      ]);
    }

    const [bucket] = await this.prisma.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "StaffLoginThrottle" ("key", "attempts", "windowEndsAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "StaffLoginThrottle"."windowEndsAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE LEAST("StaffLoginThrottle"."attempts" + 1, ${limit + 1}::integer) END,
        "windowEndsAt" = CASE WHEN "StaffLoginThrottle"."windowEndsAt" <= CURRENT_TIMESTAMP
          THEN EXCLUDED."windowEndsAt" ELSE "StaffLoginThrottle"."windowEndsAt" END
      RETURNING "attempts"
    `;
    if (!bucket || bucket.attempts > limit) {
      throw new HttpException(
        "Too many sign-in attempts. Try again in a few minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
