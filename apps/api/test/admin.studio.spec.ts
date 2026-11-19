import { createHash, randomBytes } from "node:crypto";
import { Global, Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Secret, TOTP } from "otpauth";
import { AdminModule } from "../src/admin/admin.module";
import { hashPassword, verifyPassword } from "../src/admin/password";
import { newMfaSecret, readMfaSecret } from "../src/admin/staff-security";
import { PrismaService } from "../src/database/prisma.service";

jest.mock("../src/database/prisma.service", () => ({ PrismaService: class PrismaService {} }));

const prisma = {
  staffAccount: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  staffLoginThrottle: { deleteMany: jest.fn() },
  staffSession: { create: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
  staffChallenge: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  studioAuditEvent: { create: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  show: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  episode: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
};

@Global()
@Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })
class TestDatabaseModule {}

@Module({ imports: [TestDatabaseModule, AdminModule] })
class TestAdminModule {}

const email = "staff@example.test";
const password = randomBytes(24).toString("base64url");
const bearer = randomBytes(32).toString("base64url");
const now = new Date("2026-11-19T12:00:00.000Z");
const editor = { id: "editor-id", email, role: "EDITOR" };
const admin = { ...editor, role: "ADMIN" };
const showInput = {
  title: "Production",
  slug: "production",
  description: "Description",
  status: "DRAFT",
  posterUrl: "https://images.example.test/cover.png",
  featured: false,
  genre: "Culture",
  releaseYear: 2026,
  trailerYoutubeVideoId: null,
};
const episodeInput = {
  showId: "production-id",
  title: "Episode",
  slug: "episode-one",
  description: null,
  status: "DRAFT",
  youtubeVideoId: "https://youtu.be/hyGLKmbw_EM?t=20",
  episodeNumber: 1,
  durationSeconds: 900,
  publishedAt: null,
};
const storedShow = {
  ...showInput,
  id: "production-id",
  metadata: { genre: "Culture", internal: "keep" },
  firstPublishedAt: null,
  createdAt: now,
  updatedAt: now,
  _count: { episodes: 0 },
};

describe("Admin Studio HTTP API", () => {
  let app: INestApplication;
  let baseUrl: string;
  let credentialHash: string;
  const previousMfaKey = process.env.STAFF_MFA_KEY;

  beforeAll(async () => {
    process.env.STAFF_MFA_KEY = randomBytes(32).toString("base64url");
    credentialHash = await hashPassword(password);
    app = await NestFactory.create(TestAdminModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    baseUrl = `${await app.getUrl()}/api/v1/admin`;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((work: (tx: typeof prisma) => unknown) => work(prisma));
    prisma.staffAccount.updateMany.mockResolvedValue({ count: 1 });
    prisma.staffAccount.findUniqueOrThrow.mockResolvedValue({ mfaSecret: "enrolled" });
    prisma.staffChallenge.deleteMany.mockResolvedValue({ count: 1 });
    prisma.staffSession.findUnique.mockResolvedValue({
      authVersion: 1,
      account: { ...editor, authVersion: 1 },
    });
    prisma.staffAccount.findUnique.mockResolvedValue({
      ...editor,
      active: true,
      authVersion: 1,
      passwordHash: credentialHash,
    });
    prisma.$queryRaw.mockResolvedValue([{ attempts: 1 }]);
  });

  afterAll(async () => {
    if (previousMfaKey === undefined) delete process.env.STAFF_MFA_KEY;
    else process.env.STAFF_MFA_KEY = previousMfaKey;
    await app?.close();
  });

  function request(path: string, method = "GET", data?: unknown, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  it("hashes passwords with different salts and verifies the stored format", async () => {
    expect(await hashPassword(password)).not.toBe(credentialHash);
    expect(await verifyPassword(password, credentialHash)).toBe(true);
    expect(await verifyPassword(`${password}different`, credentialHash)).toBe(false);
    expect(await verifyPassword(password, "invalid")).toBe(false);
  });

  it("issues a short-lived MFA challenge instead of a session after a password check", async () => {
    const response = await request("/auth/login", "POST", {
      email: ` ${email.toUpperCase()} `,
      password,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.kind).toBe("MFA");
    expect(result).not.toHaveProperty("account");
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prisma.staffSession.create).not.toHaveBeenCalled();
    expect(prisma.staffChallenge.create).toHaveBeenCalledWith({
      data: {
        tokenHash: createHash("sha256").update(result.token).digest("hex"),
        accountId: editor.id,
        expiresAt: expect.any(Date),
        authVersion: 1,
        kind: "MFA",
        secret: null,
      },
    });
  });

  it("requires an independently issued setup code before returning an enrollment challenge", async () => {
    prisma.staffAccount.findUniqueOrThrow.mockResolvedValue({ mfaSecret: null });
    expect((await request("/auth/login", "POST", { email, password })).status).toBe(401);
    expect(prisma.staffChallenge.create).not.toHaveBeenCalled();
    const setupCode = randomBytes(32).toString("base64url");
    const response = await request("/auth/login", "POST", { email, password, setupCode });
    expect(response.status).toBe(200);
    expect((await response.json()).kind).toBe("ENROLL");
    expect(prisma.staffChallenge.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tokenHash: createHash("sha256").update(setupCode).digest("hex"),
        kind: "SETUP",
        accountId: editor.id,
      }),
    });
    expect(prisma.staffSession.create).not.toHaveBeenCalled();
  });

  it("accepts signup only for an active pending account with a valid invitation", async () => {
    const code = randomBytes(32).toString("base64url");
    prisma.staffChallenge.findUnique.mockResolvedValueOnce(null);
    expect((await request("/auth/signup", "POST", { code, password })).status).toBe(401);
    expect(prisma.staffAccount.update).not.toHaveBeenCalled();
    expect(prisma.staffChallenge.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: "INVITE",
          account: { active: true, passwordHash: "" },
        }),
      }),
    );
    prisma.staffChallenge.findUnique.mockResolvedValueOnce({
      accountId: editor.id,
      authVersion: 1,
      account: { email },
    });
    prisma.staffAccount.update.mockResolvedValueOnce({ id: editor.id, authVersion: 2 });
    const response = await request("/auth/signup", "POST", { code, password });
    expect(response.status).toBe(200);
    expect((await response.json()).kind).toBe("ENROLL");
    expect(prisma.staffSession.create).not.toHaveBeenCalled();
    expect(prisma.studioAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "INVITE_ACCEPTED", resourceId: editor.id }),
    });
  });

  it("enrolls only after a valid OTP, consumes the challenge, and writes an audit event", async () => {
    const secret = newMfaSecret(editor.id);
    const otp = new TOTP({ secret: Secret.fromBase32(readMfaSecret(editor.id, secret)) });
    prisma.staffChallenge.findUnique
      .mockResolvedValueOnce({ accountId: editor.id, authVersion: 1 })
      .mockResolvedValueOnce({
        kind: "ENROLL",
        authVersion: 1,
        secret,
        account: { ...editor, mfaSecret: null, lastTotpStep: null },
      });
    const response = await request("/auth/verify", "POST", { code: otp.generate() }, bearer);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.account).toEqual(editor);
    expect(prisma.staffSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: createHash("sha256").update(result.token).digest("hex"),
        authVersion: 1,
      }),
    });
    expect(prisma.staffChallenge.delete).toHaveBeenCalled();
    expect(prisma.studioAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "MFA_ENROLLED", resourceId: editor.id }),
    });
  });

  it("rejects a previously used OTP step and counts the failed verification", async () => {
    const encrypted = newMfaSecret(editor.id);
    const otp = new TOTP({ secret: Secret.fromBase32(readMfaSecret(editor.id, encrypted)) });
    const timestamp = Date.now();
    prisma.staffChallenge.findUnique
      .mockResolvedValueOnce({ accountId: editor.id, authVersion: 1 })
      .mockResolvedValueOnce({
        kind: "MFA",
        authVersion: 1,
        account: { ...editor, mfaSecret: encrypted, lastTotpStep: Math.floor(timestamp / 30_000) },
      });
    expect(
      (await request("/auth/verify", "POST", { code: otp.generate({ timestamp }) }, bearer)).status,
    ).toBe(401);
    expect(prisma.staffChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
    expect(prisma.staffSession.create).not.toHaveBeenCalled();
  });

  it("restricts access changes and private staff audit events to administrators", async () => {
    expect(
      (await request("/staff/editor-id/access", "POST", { action: "REVOKE" }, bearer)).status,
    ).toBe(403);
    expect((await request("/audit?kind=STAFF", "GET", undefined, bearer)).status).toBe(403);
    expect(prisma.staffAccount.update).not.toHaveBeenCalled();
    prisma.studioAuditEvent.findMany.mockResolvedValue([]);
    expect((await request("/audit", "GET", undefined, bearer)).status).toBe(200);
    expect(prisma.studioAuditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { resource: { in: ["SHOW", "EPISODE", "ARTICLE"] } } }),
    );
  });

  it("rejects wrong credentials, disabled staff, and unknown staff with the same response", async () => {
    const wrong = await request("/auth/login", "POST", { email, password: `${password}different` });
    expect(wrong.status).toBe(401);
    const body = await wrong.json();
    prisma.staffAccount.findUnique.mockResolvedValueOnce({
      ...editor,
      active: false,
      passwordHash: credentialHash,
    });
    const disabled = await request("/auth/login", "POST", { email, password });
    prisma.staffAccount.findUnique.mockResolvedValueOnce(null);
    const unknown = await request("/auth/login", "POST", { email, password });
    expect(disabled.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await disabled.json()).message).toEqual(body.message);
    expect((await unknown.json()).message).toEqual(body.message);
    expect(prisma.staffSession.create).not.toHaveBeenCalled();
  });

  it("rate-limits before deriving a password or looking up a staff account", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([{ attempts: 9 }]);
    expect((await request("/auth/login", "POST", { email, password })).status).toBe(429);
    expect(prisma.staffAccount.findUnique).not.toHaveBeenCalled();
  });

  it("has no registration endpoint and rejects anonymous reads and writes", async () => {
    expect((await request("/auth/register", "POST", { email, password })).status).toBe(404);
    expect((await request("/dashboard")).status).toBe(401);
    expect((await request("/shows", "POST", showInput)).status).toBe(401);
    expect(prisma.show.create).not.toHaveBeenCalled();
  });

  it("requires an unexpired session for an active account and revokes it on logout", async () => {
    const tokenHash = createHash("sha256").update(bearer).digest("hex");
    const me = await request("/auth/me", "GET", undefined, bearer);
    expect(await me.json()).toEqual(editor);
    expect(prisma.staffSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash,
          expiresAt: { gt: expect.any(Date) },
          account: { active: true, mfaSecret: { not: null } },
        },
      }),
    );
    expect((await request("/auth/logout", "POST", undefined, bearer)).status).toBe(204);
    expect(prisma.staffSession.deleteMany).toHaveBeenCalledWith({ where: { tokenHash } });
    prisma.staffSession.findUnique.mockResolvedValueOnce({
      authVersion: 0,
      account: { ...editor, authVersion: 1 },
    });
    expect((await request("/auth/me", "GET", undefined, bearer)).status).toBe(401);
    prisma.staffSession.findUnique.mockResolvedValueOnce(null);
    expect((await request("/auth/me", "GET", undefined, bearer)).status).toBe(401);
  });

  it("allows editors to create drafts and publish, but restricts archiving to admins", async () => {
    prisma.show.create.mockResolvedValue(storedShow);
    expect((await request("/shows", "POST", showInput, bearer)).status).toBe(201);
    expect(prisma.studioAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resource: "SHOW",
        actor: editor.email,
        action: "CREATED",
        nextStatus: "DRAFT",
      }),
    });
    prisma.show.findUnique.mockResolvedValue(storedShow);
    prisma.show.update.mockResolvedValue({ ...storedShow, status: "PUBLISHED" });
    const publish = { ...showInput, status: "PUBLISHED", revision: now.toISOString() };
    expect((await request("/shows/production-id", "PATCH", publish, bearer)).status).toBe(200);
    expect(prisma.show.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: storedShow.id, updatedAt: now },
        data: expect.objectContaining({
          firstPublishedAt: expect.any(Date),
          metadata: expect.objectContaining({ internal: "keep" }),
        }),
      }),
    );
    const archive = { ...publish, status: "ARCHIVED" };
    expect((await request("/shows/production-id", "PATCH", archive, bearer)).status).toBe(403);
    prisma.staffSession.findUnique.mockResolvedValueOnce({ account: admin });
    expect((await request("/shows/production-id", "PATCH", archive, bearer)).status).toBe(200);
  });

  it("preserves previously published URLs and reports stale edits", async () => {
    const patch = { ...showInput, revision: now.toISOString() };
    prisma.show.findUnique.mockResolvedValue({ ...storedShow, firstPublishedAt: now });
    expect(
      (await request("/shows/production-id", "PATCH", { ...patch, slug: "changed" }, bearer))
        .status,
    ).toBe(409);
    expect(prisma.show.update).not.toHaveBeenCalled();
    prisma.show.update.mockRejectedValueOnce({ code: "P2025" });
    expect((await request("/shows/production-id", "PATCH", patch, bearer)).status).toBe(409);
  });

  it("normalizes YouTube URLs and reports duplicate IDs", async () => {
    prisma.episode.create.mockResolvedValue({
      ...episodeInput,
      id: "episode-id",
      show: { title: "Production" },
      createdAt: now,
      updatedAt: now,
      firstPublishedAt: null,
      youtubeVideoId: "hyGLKmbw_EM",
    });
    const response = await request("/episodes", "POST", episodeInput, bearer);
    expect(response.status).toBe(201);
    expect((await response.json()).youtubeVideoId).toBe("hyGLKmbw_EM");
    expect(prisma.episode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ youtubeVideoId: "hyGLKmbw_EM", showId: storedShow.id }),
      }),
    );
    prisma.episode.create.mockRejectedValueOnce({ code: "P2002" });
    expect((await request("/episodes", "POST", episodeInput, bearer)).status).toBe(409);
  });

  it("rejects non-YouTube URLs, insecure artwork, and publication without a date", async () => {
    expect(
      (
        await request(
          "/episodes",
          "POST",
          {
            ...episodeInput,
            youtubeVideoId: "https://youtube.com.example.test/watch?v=hyGLKmbw_EM",
          },
          bearer,
        )
      ).status,
    ).toBe(400);
    expect(
      (await request("/episodes", "POST", { ...episodeInput, status: "PUBLISHED" }, bearer)).status,
    ).toBe(400);
    expect(
      (
        await request(
          "/shows",
          "POST",
          { ...showInput, posterUrl: "http://images.example.test/cover.png" },
          bearer,
        )
      ).status,
    ).toBe(400);
    expect(
      (await request("/shows", "POST", { ...showInput, posterUrl: "https://" }, bearer)).status,
    ).toBe(400);
    expect(prisma.episode.create).not.toHaveBeenCalled();
    expect(prisma.show.create).not.toHaveBeenCalled();
  });
});
