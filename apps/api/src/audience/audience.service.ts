import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { AudienceLogin, AudienceProfileUpdate, AudienceRegister } from "@biling/contracts";
import { audienceProfileSchema, audienceSessionSchema } from "@biling/schemas";
import { hashPassword, verifyPassword } from "../admin/password";
import { PrismaService } from "../database/prisma.service";
import type { AudienceChallengeKind, Prisma } from "../generated/prisma/client";
import { AudienceEmail } from "./audience-email";

const profileFields = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  biography: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileFields }>;

function profile(row: ProfileRow) {
  return audienceProfileSchema.parse({
    ...row,
    role: "USER",
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt.toISOString(),
  });
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const tokenHash = (token: string) => digest("biling-audience:" + token);
const newToken = () => randomBytes(32).toString("base64url");
const invalidToken = () =>
  new BadRequestException("This link is invalid or expired. Request a new one.");

function duplicate(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === "P2002";
}

async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

@Injectable()
export class AudienceService {
  private nextCleanup = 0;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AudienceEmail) private readonly email: AudienceEmail,
  ) {}

  capabilities() {
    return this.email.capabilities();
  }

  async register({ email, password, username, displayName }: AudienceRegister, ip: string) {
    const { registration } = this.capabilities();
    if (registration === "unavailable")
      throw new ServiceUnavailableException("Registration is temporarily unavailable.");
    await this.limit("registration", ip, 30, email, 5);
    const passwordHash = await hashPassword(password);
    // Legacy identity rows may have mixed-case addresses and have no audience credentials.
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
    });
    if (existing) return;
    let user;
    try {
      user = await this.prisma.user.create({
        data: { email, username, displayName, passwordHash },
        select: { id: true },
      });
    } catch (error) {
      if (!duplicate(error)) throw error;
      if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) return;
      throw new ConflictException("That username is unavailable.");
    }
    if (registration === "verify") await this.sendChallenge(user.id, "VERIFY_EMAIL");
  }

  async login({ email, password }: AudienceLogin, ip: string) {
    await this.limit("login", ip, 120, email, 10);
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    const valid = await verifyPassword(password, row?.passwordHash ?? undefined);
    const invalid = () => new UnauthorizedException("Invalid email or password.");
    if (!row || !valid) throw invalid();

    return this.prisma.$transaction(async (tx) => {
      await lockUser(tx, row.id);
      const user = await tx.user.findUnique({
        where: { id: row.id },
        select: { ...profileFields, passwordHash: true },
      });
      if (!user || user.passwordHash !== row.passwordHash || !user.username) throw invalid();
      if (!user.emailVerifiedAt && this.capabilities().registration !== "local")
        throw new ForbiddenException(
          "Verify your email before signing in. You can request another link.",
        );
      const token = newToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.audienceSession.create({
        data: { tokenHash: tokenHash(token), userId: user.id, expiresAt },
      });
      return audienceSessionSchema.parse({
        token,
        expiresAt: expiresAt.toISOString(),
        user: profile(user),
      });
    });
  }

  async authenticate(token: string) {
    const session = await this.prisma.audienceSession.findUnique({
      where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() } },
      select: { user: { select: profileFields } },
    });
    if (
      !session?.user.username ||
      (!session.user.emailVerifiedAt && this.capabilities().registration !== "local")
    )
      throw new UnauthorizedException("Sign in to continue.");
    return profile(session.user);
  }

  async logout(token: string) {
    await this.prisma.audienceSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }

  async updateProfile(userId: string, fields: AudienceProfileUpdate) {
    try {
      return profile(
        await this.prisma.user.update({
          where: { id: userId },
          data: fields,
          select: profileFields,
        }),
      );
    } catch (error) {
      if (duplicate(error)) throw new ConflictException("That username is unavailable.");
      throw error;
    }
  }

  async limitCommunity(userId: string, ip: string, action: string, limit = 20) {
    await this.limit(`community-${action}`, ip, limit * 3, userId, limit);
  }

  async requestEmail(email: string, kind: AudienceChallengeKind, ip: string) {
    if (!this.capabilities().emailAvailable)
      throw new ServiceUnavailableException("Account email is currently unavailable.");
    await this.limit(kind, ip, 60, email, 3);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) await this.sendChallenge(user.id, kind);
  }

  async finishEmail(token: string, password: string, kind: AudienceChallengeKind, ip: string) {
    await this.limit("redeem-" + kind, ip, 120, tokenHash(token), 10);
    const hash = tokenHash(token);
    const challenge = await this.prisma.audienceChallenge.findUnique({
      where: { tokenHash: hash, kind, expiresAt: { gt: new Date() } },
      select: { userId: true, user: { select: { passwordHash: true } } },
    });
    if (!challenge?.user.passwordHash) throw invalidToken();
    const reset = kind === "RESET_PASSWORD";
    const knownHash = challenge.user.passwordHash;
    if (!reset && !(await verifyPassword(password, knownHash)))
      throw new BadRequestException("The password or verification link is invalid.");
    const replacement = reset ? await hashPassword(password) : knownHash;

    await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, challenge.userId);
      const owner = await tx.user.findUnique({
        where: { id: challenge.userId },
        select: { emailVerifiedAt: true, passwordHash: true },
      });
      if (!owner || owner.passwordHash !== knownHash) throw invalidToken();
      const consumed = await tx.audienceChallenge.deleteMany({
        where: { tokenHash: hash, kind, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) throw invalidToken();
      await tx.user.update({
        where: { id: challenge.userId },
        data: { emailVerifiedAt: owner.emailVerifiedAt ?? new Date(), passwordHash: replacement },
      });
      if (reset) {
        await tx.audienceSession.deleteMany({ where: { userId: challenge.userId } });
        await tx.audienceChallenge.deleteMany({ where: { userId: challenge.userId } });
      }
    });
  }

  private async sendChallenge(userId: string, kind: AudienceChallengeKind) {
    const token = newToken();
    const recipient = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true, passwordHash: true, emailVerifiedAt: true },
      });
      if (
        !user?.username ||
        !user.passwordHash ||
        (kind === "VERIFY_EMAIL" && user.emailVerifiedAt)
      )
        return null;
      const ttl = kind === "RESET_PASSWORD" ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const state = { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + ttl) };
      await tx.audienceChallenge.upsert({
        where: { userId_kind: { userId, kind } },
        create: { ...state, userId, kind },
        update: state,
      });
      return user.email;
    });
    if (recipient) await this.email.send(kind, recipient, token);
  }

  private async limit(
    action: string,
    ip: string,
    ipLimit: number,
    subject: string,
    subjectLimit: number,
  ) {
    const now = new Date();
    if (now.getTime() >= this.nextCleanup) {
      this.nextCleanup = now.getTime() + 5 * 60 * 1000;
      await Promise.all([
        this.prisma.audienceThrottle.deleteMany({ where: { windowEndsAt: { lte: now } } }),
        this.prisma.audienceSession.deleteMany({ where: { expiresAt: { lte: now } } }),
        this.prisma.audienceChallenge.deleteMany({ where: { expiresAt: { lte: now } } }),
      ]);
    }
    await this.consume(digest(action + ":ip:" + ip), ipLimit);
    await this.consume(digest(action + ":subject:" + subject), subjectLimit);
  }

  private async consume(key: string, limit: number) {
    const [bucket] = await this.prisma.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "AudienceThrottle" ("key", "attempts", "windowEndsAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AudienceThrottle"."windowEndsAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE LEAST("AudienceThrottle"."attempts" + 1, ${limit + 1}::integer) END,
        "windowEndsAt" = CASE WHEN "AudienceThrottle"."windowEndsAt" <= CURRENT_TIMESTAMP
          THEN EXCLUDED."windowEndsAt" ELSE "AudienceThrottle"."windowEndsAt" END
      RETURNING "attempts"
    `;
    if (!bucket || bucket.attempts > limit)
      throw new HttpException(
        "Too many attempts. Try again in a few minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
