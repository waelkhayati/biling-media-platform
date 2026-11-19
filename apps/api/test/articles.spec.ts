import { randomBytes } from "node:crypto";
import { Global, Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ArticleModule } from "../src/articles/article.module";
import { PrismaService } from "../src/database/prisma.service";

jest.mock("../src/database/prisma.service", () => ({ PrismaService: class PrismaService {} }));

const prisma = {
  article: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  show: { count: jest.fn() },
  episode: { count: jest.fn() },
  staffSession: { findUnique: jest.fn() },
  studioAuditEvent: { create: jest.fn() },
  $transaction: jest.fn(),
};

@Global()
@Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })
class TestDatabaseModule {}

@Module({ imports: [TestDatabaseModule, ArticleModule] })
class TestArticleModule {}

const token = randomBytes(32).toString("base64url");
const date = new Date("2026-11-19T12:00:00.000Z");
const draft = {
  title: "Test fixture",
  slug: "test-fixture",
  author: "Fixture Author",
  category: "Culture",
  language: "en",
  tags: ["film"],
  excerpt: "Test excerpt",
  imageUrl: null,
  imageAlt: null,
  imageCaption: null,
  imageCredit: null,
  featured: false,
  seoTitle: null,
  seoDescription: null,
  status: "DRAFT",
  body: [{ type: "paragraph", text: "A test fixture." }],
  showIds: [],
  episodeIds: [],
};
const row = {
  ...draft,
  id: "test-id",
  createdAt: date,
  updatedAt: date,
  publishedAt: null,
  firstPublishedAt: null,
  shows: [],
  episodes: [],
};
const publicFilter = { status: "PUBLISHED", publishedAt: { not: null } };
const revision = date.toISOString();

describe("Editorial API", () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestArticleModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    base = (await app.getUrl()) + "/api/v1";
  });

  afterAll(async () => app?.close());

  function session(role = "EDITOR") {
    prisma.staffSession.findUnique.mockResolvedValue({
      authVersion: 1,
      account: { id: "staff-id", role, email: "editor@example.test", authVersion: 1 },
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    session();
    prisma.$transaction.mockImplementation((work: (tx: typeof prisma) => unknown) => work(prisma));
    prisma.article.findMany.mockResolvedValue([]);
    prisma.article.groupBy.mockResolvedValue([]);
    prisma.article.findUnique.mockResolvedValue(null);
  });

  function staff(path = "", method = "GET", body?: unknown) {
    return fetch(base + "/admin/articles" + path, {
      method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it("requires an authenticated staff session for listing, reading, creating and editing", async () => {
    for (const [method, path] of [
      ["GET", ""],
      ["GET", "/test-id"],
      ["POST", ""],
      ["PATCH", "/test-id"],
    ]) {
      const response = await fetch(base + "/admin/articles" + path, { method });
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    prisma.staffSession.findUnique.mockResolvedValue(null);
    expect((await staff()).status).toBe(401);
    expect(prisma.article.findUnique).not.toHaveBeenCalled();
  });

  it("creates an audited draft, allows staff to preview it, and excludes it publicly", async () => {
    prisma.article.create.mockResolvedValue(row);
    const response = await staff("", "POST", draft);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: row.id, status: "DRAFT", publishedAt: null });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.studioAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resource: "ARTICLE",
        resourceId: row.id,
        action: "CREATED",
        nextStatus: "DRAFT",
      }),
    });
    prisma.article.findUnique.mockImplementation(({ where }) => (where.id ? row : null));
    expect((await staff("/test-id")).status).toBe(200);
    expect((await fetch(base + "/articles/test-fixture")).status).toBe(404);
    expect(prisma.article.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { slug: "test-fixture", ...publicFilter },
      }),
    );
  });

  it("publishes and unpublishes by revision, locks published slugs, and records status changes", async () => {
    prisma.article.findUnique.mockResolvedValue(row);
    const published = { ...row, status: "PUBLISHED", publishedAt: date, firstPublishedAt: date };
    prisma.article.update.mockResolvedValue(published);
    expect(
      (await staff("/test-id", "PATCH", { ...draft, status: "PUBLISHED", revision })).status,
    ).toBe(200);
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: row.id, updatedAt: date },
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
          firstPublishedAt: expect.any(Date),
        }),
      }),
    );
    prisma.article.findUnique.mockResolvedValue(published);
    expect((await staff("/test-id", "PATCH", { ...draft, slug: "changed", revision })).status).toBe(
      409,
    );
    prisma.article.update.mockResolvedValue({ ...published, status: "DRAFT", publishedAt: null });
    expect((await staff("/test-id", "PATCH", { ...draft, revision })).status).toBe(200);
    expect(prisma.studioAuditEvent.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "UNPUBLISHED" }),
    });
  });

  it("reserves archiving for admins and rejects duplicate slugs and stale writes", async () => {
    prisma.article.findUnique.mockResolvedValue(row);
    const archive = { ...draft, status: "ARCHIVED", revision };
    expect((await staff("/test-id", "PATCH", archive)).status).toBe(403);
    expect(prisma.article.update).not.toHaveBeenCalled();
    session("ADMIN");
    prisma.article.update.mockResolvedValue({ ...row, status: "ARCHIVED" });
    expect((await staff("/test-id", "PATCH", archive)).status).toBe(200);
    prisma.article.update.mockRejectedValue({ code: "P2025" });
    expect((await staff("/test-id", "PATCH", archive)).status).toBe(409);
    prisma.article.create.mockRejectedValue({ code: "P2002" });
    expect((await staff("", "POST", draft)).status).toBe(409);
  });

  it("validates publication, embeds and image fields before writing", async () => {
    const invalid = [
      { ...draft, status: "PUBLISHED", body: [] },
      { ...draft, imageUrl: "https://images.example.test/cover.jpg" },
      {
        ...draft,
        body: [{ type: "image", url: "data:image/svg+xml,unsafe", alt: "Alt", credit: null }],
      },
      { ...draft, body: [{ type: "paragraph", text: "Text", html: "<script>test</script>" }] },
      { ...draft, body: [{ type: "youtube", videoId: "https://videos.example.test/forged" }] },
      {
        ...draft,
        body: Array.from({ length: 6 }, () => ({ type: "paragraph", text: "\u0645".repeat(5000) })),
      },
    ];
    for (const body of invalid) expect((await staff("", "POST", body)).status).toBe(400);
    expect(prisma.article.create).not.toHaveBeenCalled();
  });

  it("validates and bounds published filtering and scopes episode relations to published shows", async () => {
    prisma.article.groupBy.mockResolvedValue([{ category: "Culture" }]);
    const response = await fetch(
      base + "/articles?category=Culture&tag=FILM&limit=5&page=2&show=production&episode=pilot",
    );
    expect(await response.json()).toEqual({
      items: [],
      categories: ["Culture"],
      page: 2,
      hasMore: false,
    });
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ...publicFilter,
          category: "Culture",
          tags: { has: "film" },
          episodes: {
            some: {
              ...publicFilter,
              slug: "pilot",
              show: { status: "PUBLISHED", slug: "production" },
            },
          },
        }),
        skip: 5,
        take: 6,
      }),
    );
    expect((await fetch(base + "/articles?limit=100")).status).toBe(400);
    expect((await fetch(base + "/articles?episode=pilot")).status).toBe(400);
  });

  it("filters the staff list and restricts the sitemap to published slugs", async () => {
    expect((await staff("?status=DRAFT&author=Fixture%20Author&category=Culture")).status).toBe(
      200,
    );
    expect(prisma.article.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: "DRAFT",
          author: { equals: "Fixture Author", mode: "insensitive" },
          category: { equals: "Culture", mode: "insensitive" },
        },
        take: 51,
      }),
    );
    prisma.article.findMany.mockResolvedValue([{ slug: "published-fixture", updatedAt: date }]);
    const sitemap = await fetch(base + "/articles/sitemap");
    expect(await sitemap.json()).toEqual([{ slug: "published-fixture", updatedAt: revision }]);
    expect(prisma.article.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: publicFilter,
        select: { slug: true, updatedAt: true },
      }),
    );
  });

  it("returns safe public projections and published related content", async () => {
    prisma.article.findUnique.mockResolvedValue({
      ...row,
      publishedAt: date,
      shows: [{ title: "Fixture Show", slug: "fixture-show" }],
    });
    const response = await fetch(base + "/articles/test-fixture");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      slug: row.slug,
      body: row.body,
      shows: [{ slug: "fixture-show" }],
      related: [],
    });
    expect(json).not.toHaveProperty("firstPublishedAt");
    expect(json).not.toHaveProperty("status");
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ...publicFilter, id: { not: row.id } }),
        take: 3,
      }),
    );
  });
});
