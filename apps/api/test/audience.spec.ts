import { Global, Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createHash, randomBytes } from "node:crypto";
import { AdminModule } from "../src/admin/admin.module";
import { hashPassword } from "../src/admin/password";
import { AudienceController } from "../src/audience/audience.controller";
import { AudienceEmail } from "../src/audience/audience-email";
import { AudienceService } from "../src/audience/audience.service";
import { PrismaService } from "../src/database/prisma.service";

jest.mock("../src/database/prisma.service", () => ({ PrismaService: class PrismaService {} }));

const prisma = {
  user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  audienceSession: { create: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
  audienceChallenge: { findUnique: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  audienceThrottle: { deleteMany: jest.fn() },
  staffSession: { findUnique: jest.fn() },
  staffAccount: { findMany: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

const mail = { capabilities: jest.fn(), send: jest.fn() };
const email = "viewer@example.test";
const password = randomBytes(16).toString("base64url");
const input = { email, password, username: "viewer_one", displayName: "Biling Viewer" };
const token = randomBytes(32).toString("base64url");
const hash = (code: string) =>
  createHash("sha256")
    .update("biling-audience:" + code)
    .digest("hex");
const profile = {
  id: "audience-id",
  email,
  username: input.username,
  displayName: input.displayName,
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  avatarUrl: null,
  biography: null,
};

@Global()
@Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })
class TestDatabaseModule {}

@Module({
  imports: [AdminModule, TestDatabaseModule],
  controllers: [AudienceController],
  providers: [AudienceService, { provide: AudienceEmail, useValue: mail }],
})
class TestModule {}

describe("Audience and staff HTTP boundaries", () => {
  let app: INestApplication;
  let base: string;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(password);
    app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    base = (await app.getUrl()) + "/api/v1";
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$queryRaw.mockResolvedValue([{ attempts: 1 }]);
    prisma.$transaction.mockImplementation((work: (tx: typeof prisma) => unknown) => work(prisma));
    prisma.user.create.mockResolvedValue({ id: profile.id });
    prisma.user.update.mockResolvedValue(profile);
    prisma.audienceChallenge.deleteMany.mockResolvedValue({ count: 1 });
    mail.capabilities.mockReturnValue({ emailAvailable: false, registration: "local" });
  });

  afterAll(async () => app?.close());

  function request(path: string, data?: object, bearer?: string, method?: string) {
    return fetch(base + path, {
      method: method ?? (data ? "POST" : "GET"),
      headers: {
        ...(data && { "Content-Type": "application/json" }),
        ...(bearer && { Authorization: "Bearer " + bearer }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  it("registers and logs in with a hashed password and a separate audience bearer", async () => {
    const registered = await request("/audience/register", {
      ...input,
      email: "VIEWER@example.test",
      username: "VIEWER_ONE",
    });
    expect(registered.status).toBe(202);
    expect(await registered.text()).toBe("");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email,
        username: input.username,
        displayName: input.displayName,
        passwordHash: expect.stringMatching(/^scrypt-v1\$/),
      },
      select: { id: true },
    });
    prisma.user.findUnique.mockResolvedValue({ ...profile, passwordHash });
    const response = await request("/audience/login", { email, password });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const session = await response.json();
    expect(session.user).toMatchObject({ username: input.username, role: "USER" });
    expect(session.user).not.toHaveProperty("passwordHash");
    expect(session.user).not.toHaveProperty("emailVerifiedAt");
    expect(prisma.audienceSession.create).toHaveBeenCalledWith({
      data: {
        userId: profile.id,
        tokenHash: hash(session.token),
        expiresAt: new Date(session.expiresAt),
      },
    });
    expect((await request("/admin/auth/me", undefined, session.token)).status).toBe(401);
  });

  it("uses the same response for invalid passwords and unknown email addresses", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: profile.id, passwordHash });
    for (const expected of [
      { email, password: password + "wrong" },
      { email: "other@example.test", password },
    ]) {
      const response = await request("/audience/login", expected);
      expect(response.status).toBe(401);
      expect((await response.json()).message).toBe("Invalid email or password.");
    }
    expect(prisma.audienceSession.create).not.toHaveBeenCalled();
  });

  it("returns a generic response for duplicate email and a conflict for unavailable usernames", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: "legacy-id" });
    expect((await request("/audience/register", input)).status).toBe(202);
    expect(prisma.user.create).not.toHaveBeenCalled();
    prisma.user.create.mockRejectedValue({ code: "P2002" });
    expect((await request("/audience/register", input)).status).toBe(409);
    prisma.user.findUnique.mockResolvedValueOnce({ id: "concurrent-registration" });
    expect((await request("/audience/register", input)).status).toBe(202);
  });

  it("protects profiles and only allows the owner to change approved fields", async () => {
    const updates = {
      username: "biling_viewer",
      displayName: "Viewer",
      biography: "Tunisian film fan",
      avatarUrl: null,
    };
    expect((await request("/audience/me")).status).toBe(401);
    expect((await request("/audience/me", updates, undefined, "PATCH")).status).toBe(401);
    prisma.audienceSession.findUnique.mockResolvedValue({ user: profile });
    const updated = await request("/audience/me", updates, token, "PATCH");
    expect(updated.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: profile.id },
        data: updates,
      }),
    );
    prisma.user.update.mockRejectedValueOnce({ code: "P2002" });
    expect((await request("/audience/me", updates, token, "PATCH")).status).toBe(409);
    for (const changes of [
      { role: "ADMIN" },
      { userId: "someone-else" },
      { email: "other@example.test" },
      { avatarUrl: "http://localhost/avatar" },
    ]) {
      expect(
        (await request("/audience/me", { ...updates, ...changes }, token, "PATCH")).status,
      ).toBe(400);
    }
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    expect((await request("/audience/register", { ...input, role: "EDITOR" })).status).toBe(400);
  });

  it("rejects expired sessions and revokes presented credentials on logout", async () => {
    expect((await request("/audience/me", undefined, token)).status).toBe(401);
    expect(prisma.audienceSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hash(token), expiresAt: { gt: expect.any(Date) } },
      }),
    );
    expect((await request("/audience/logout", undefined, token, "POST")).status).toBe(204);
    expect(prisma.audienceSession.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hash(token) },
    });
  });

  it("requires email ownership on hosted registration and stores only a verification digest", async () => {
    mail.capabilities.mockReturnValue({ emailAvailable: true, registration: "verify" });
    prisma.user.findUnique.mockResolvedValue({ ...profile, passwordHash, emailVerifiedAt: null });
    expect((await request("/audience/register", input)).status).toBe(202);
    const [kind, recipient, verificationToken] = mail.send.mock.calls[0];
    expect(kind).toBe("VERIFY_EMAIL");
    expect(recipient).toBe(email);
    expect(prisma.audienceChallenge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tokenHash: hash(verificationToken),
          kind: "VERIFY_EMAIL",
        }),
      }),
    );
    expect((await request("/audience/login", { email, password })).status).toBe(403);
    prisma.audienceChallenge.findUnique.mockResolvedValue({
      userId: profile.id,
      user: { passwordHash },
    });
    expect(
      (await request("/audience/verify-email", { token: verificationToken, password: "wrong" }))
        .status,
    ).toBe(400);
    expect(
      (await request("/audience/verify-email", { token: verificationToken, password })).status,
    ).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { passwordHash, emailVerifiedAt: expect.any(Date) },
      }),
    );
  });

  it("resets passwords once with an expiring token and revokes all audience sessions", async () => {
    const reset = { token, password: randomBytes(16).toString("base64url") };
    expect((await request("/audience/reset-password", reset)).status).toBe(400);
    expect(prisma.audienceChallenge.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash: hash(token),
          kind: "RESET_PASSWORD",
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
    prisma.audienceChallenge.findUnique.mockResolvedValue({
      userId: profile.id,
      user: { passwordHash },
    });
    prisma.user.findUnique.mockResolvedValue({ ...profile, passwordHash });
    expect((await request("/audience/reset-password", reset)).status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: profile.id },
        data: {
          passwordHash: expect.stringMatching(/^scrypt-v1\$/),
          emailVerifiedAt: profile.emailVerifiedAt,
        },
      }),
    );
    expect(prisma.audienceSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: profile.id },
    });
    prisma.audienceChallenge.deleteMany.mockResolvedValueOnce({ count: 0 });
    expect((await request("/audience/reset-password", reset)).status).toBe(400);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("respects email availability and rate limits without checking credentials", async () => {
    expect((await request("/audience/forgot-password", { email })).status).toBe(503);
    expect(mail.send).not.toHaveBeenCalled();
    mail.capabilities.mockReturnValue({ emailAvailable: true, registration: "verify" });
    expect((await request("/audience/forgot-password", { email })).status).toBe(202);
    prisma.$queryRaw.mockResolvedValueOnce([{ attempts: 121 }]);
    prisma.user.findUnique.mockClear();
    expect((await request("/audience/login", { email, password })).status).toBe(429);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("keeps staff permissions separate from audience identity", async () => {
    const staffToken = randomBytes(32).toString("base64url");
    for (const role of ["EDITOR", "ADMIN"]) {
      prisma.staffSession.findUnique.mockResolvedValue({
        authVersion: 1,
        account: { id: "staff-id", email, role, authVersion: 1 },
      });
      prisma.staffAccount.findMany.mockResolvedValue([]);
      expect((await request("/admin/staff", undefined, staffToken)).status).toBe(
        role === "ADMIN" ? 200 : 403,
      );
      expect((await request("/audience/me", undefined, staffToken)).status).toBe(401);
    }
  });
});
