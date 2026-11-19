import { Global, Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ContentModule } from "../src/content/content.module";
import { PrismaService } from "../src/database/prisma.service";

jest.mock("../src/database/prisma.service", () => ({ PrismaService: class PrismaService {} }));

const prisma = {
  article: { findMany: jest.fn() },
  show: { findUnique: jest.fn(), findMany: jest.fn() },
  episode: { findFirst: jest.fn(), findMany: jest.fn() },
};

@Global()
@Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })
class TestDatabaseModule {}

@Module({ imports: [TestDatabaseModule, ContentModule] })
class TestContentModule {}

const older = new Date("2026-11-03T00:00:00.000Z");
const newer = new Date("2026-11-10T00:00:00.000Z");
const show = {
  id: "show-id",
  title: "Infilet",
  slug: "infilet",
  description: "A published production",
  posterUrl: null,
  featured: true,
  status: "PUBLISHED",
  metadata: { genre: "Talk", trailerYoutubeVideoId: "invalid", hidden: "internal" },
  createdAt: older,
  updatedAt: newer,
};
const episode = {
  id: "episode-id",
  showId: show.id,
  title: "Latest episode",
  slug: "episode-02",
  description: null,
  episodeNumber: 2,
  durationSeconds: 600,
  youtubeVideoId: "hyGLKmbw_EM",
  publishedAt: newer,
  createdAt: newer,
  updatedAt: newer,
  status: "PUBLISHED",
  metadata: null,
};
const related = {
  ...episode,
  id: "related-id",
  title: "Previous episode",
  slug: "episode-01",
  publishedAt: older,
  youtubeVideoId: "invalid",
  durationSeconds: 0,
};

const publishedEpisodeFilter = { status: "PUBLISHED", publishedAt: { not: null } };
const newestFirst = [{ publishedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }];

describe("Public content routes", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestContentModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    baseUrl = `${await app.getUrl()}/api/v1`;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.article.findMany.mockResolvedValue([]);
  });
  afterAll(async () => app?.close());

  it("returns bounded article hits and scopes them to publication status", async () => {
    const match = {
      id: "test-id",
      title: "Film fixture",
      slug: "film-fixture",
      excerpt: null,
      author: "Test",
      category: "Film",
      tags: [],
      language: "en",
      imageUrl: null,
      imageAlt: null,
      imageCaption: null,
      imageCredit: null,
      featured: false,
      seoTitle: null,
      seoDescription: null,
      publishedAt: newer,
      updatedAt: newer,
    };
    prisma.show.findMany.mockResolvedValue([]);
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.article.findMany.mockResolvedValue([match, { ...match, id: "more-id" }]);
    const response = await fetch(baseUrl + "/search?q=film&limit=1");
    expect(await response.json()).toMatchObject({
      articles: [{ slug: "film-fixture" }],
      hasMore: { articles: true },
    });
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: { not: null },
          OR: expect.arrayContaining([{ excerpt: { contains: "film", mode: "insensitive" } }]),
        }),
        take: 2,
      }),
    );
  });

  it("serves the complete, newest-first published archive and exposes only public metadata", async () => {
    prisma.show.findUnique.mockResolvedValue({ ...show, episodes: [episode, related] });

    const response = await fetch(`${baseUrl}/shows/infilet`);
    expect(response.status).toBe(200);
    const detail = await response.json();
    expect(detail).toMatchObject({
      slug: "infilet",
      metadata: { genre: "Talk" },
      episodes: [
        { slug: episode.slug, publishedAt: newer.toISOString(), durationSeconds: 600 },
        { slug: related.slug, publishedAt: older.toISOString() },
      ],
    });
    expect(detail.metadata).toEqual({ genre: "Talk" });
    expect(prisma.show.findUnique).toHaveBeenCalledWith({
      where: { slug: "infilet", status: "PUBLISHED" },
      include: { episodes: { where: publishedEpisodeFilter, orderBy: newestFirst } },
    });
  });

  it("serves a valid empty archive for a published show without episodes", async () => {
    prisma.show.findUnique.mockResolvedValue({ ...show, metadata: null, episodes: [] });

    const response = await fetch(`${baseUrl}/shows/infilet`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ episodes: [], metadata: {} });
  });

  it("scopes episode details and related results to the published parent show", async () => {
    prisma.episode.findFirst.mockResolvedValue({
      ...episode,
      show: { ...show, episodes: [related] },
    });

    const response = await fetch(`${baseUrl}/shows/infilet/episodes/episode-02`);
    expect(response.status).toBe(200);
    const detail = await response.json();
    expect(detail).toMatchObject({
      episode: { slug: episode.slug, youtubeVideoId: episode.youtubeVideoId },
      show: { slug: show.slug },
      relatedEpisodes: [{ slug: related.slug }],
    });
    expect(detail.relatedEpisodes[0]).not.toHaveProperty("youtubeVideoId");
    expect(detail.relatedEpisodes[0]).not.toHaveProperty("durationSeconds");
    expect(prisma.episode.findFirst).toHaveBeenCalledWith({
      where: {
        ...publishedEpisodeFilter,
        slug: episode.slug,
        show: { slug: show.slug, status: "PUBLISHED" },
      },
      include: {
        show: {
          include: {
            episodes: {
              where: { ...publishedEpisodeFilter, slug: { not: episode.slug } },
              orderBy: newestFirst,
              take: 3,
            },
          },
        },
      },
    });
  });

  it.each(["/shows/INVALID", "/shows/infilet/episodes/%20episode", `/shows/${"a".repeat(141)}`])(
    "rejects an invalid slug without querying the database at %s",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(400);
      expect(prisma.show.findUnique).not.toHaveBeenCalled();
      expect(prisma.episode.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each(["/shows/unavailable", "/shows/wrong-show/episodes/episode-02"])(
    "returns 404 for a missing or unpublished resource at %s",
    async (path) => {
      prisma.show.findUnique.mockResolvedValue(null);
      prisma.episode.findFirst.mockResolvedValue(null);
      expect((await fetch(`${baseUrl}${path}`)).status).toBe(404);
    },
  );

  it("excludes episodes of unpublished shows from discovery", async () => {
    prisma.episode.findMany.mockResolvedValue([]);

    const response = await fetch(`${baseUrl}/episodes`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...publishedEpisodeFilter, show: { status: "PUBLISHED" } },
      }),
    );
  });

  it("groups search matches and checks for more results within a bounded query", async () => {
    const match = { ...show, _count: { episodes: 2 }, episodes: [episode] };
    prisma.show.findMany.mockResolvedValue([match]);
    prisma.episode.findMany.mockResolvedValue([
      { ...episode, show },
      { ...related, show },
    ]);

    const response = await fetch(`${baseUrl}/search?q=%20InFiLeT%20&limit=1`);
    expect(response.status).toBe(200);
    const results = await response.json();
    expect(results).toMatchObject({
      shows: [{ slug: show.slug, episodeCount: 2 }],
      episodes: [{ slug: episode.slug, showSlug: show.slug }],
      articles: [],
      hasMore: { shows: false, episodes: true, articles: false },
    });
    const text = { contains: "InFiLeT", mode: "insensitive" };
    const fields = [{ title: text }, { description: text }];
    expect(prisma.show.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED", OR: fields }, take: 2 }),
    );
    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...publishedEpisodeFilter, show: { status: "PUBLISHED" }, OR: fields },
        orderBy: newestFirst,
        take: 2,
      }),
    );
  });

  it("treats LIKE wildcards as literal text and returns empty groups", async () => {
    prisma.show.findMany.mockResolvedValue([]);
    prisma.episode.findMany.mockResolvedValue([]);

    const response = await fetch(`${baseUrl}/search?q=%25_%5C`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      shows: [],
      episodes: [],
      articles: [],
      hasMore: { shows: false, episodes: false, articles: false },
    });
    const text = { contains: "\\%\\_\\\\", mode: "insensitive" };
    expect(prisma.show.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED", OR: [{ title: text }, { description: text }] },
        take: 13,
      }),
    );
  });

  it.each(["true", "false"])(
    "combines production text and featured=%s filters",
    async (featured) => {
      prisma.show.findMany.mockResolvedValue([]);

      const response = await fetch(`${baseUrl}/shows?q=production&featured=${featured}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [] });
      const text = { contains: "production", mode: "insensitive" };
      expect(prisma.show.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "PUBLISHED",
            featured: featured === "true",
            OR: [{ title: text }, { description: text }],
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: undefined,
        }),
      );
      expect(prisma.episode.findMany).not.toHaveBeenCalled();
    },
  );

  it("bounds directory suggestions while preserving the published-only list shape", async () => {
    prisma.show.findMany.mockResolvedValue([{ ...show, _count: { episodes: 0 }, episodes: [] }]);

    const response = await fetch(`${baseUrl}/shows?limit=5`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: [{ slug: show.slug, episodeCount: 0 }] });
    expect(prisma.show.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED" }, take: 5 }),
    );
  });

  it.each([
    "/search",
    "/search?q=%20%20",
    "/search?q=a",
    `/search?q=${"a".repeat(101)}`,
    "/search?q=abc%00",
    "/search?q=abc&q=def",
    "/search?q=abc&limit=25",
    "/search?q=abc&limit=0",
    "/search?q=abc&limit=1.5",
    "/shows?featured=maybe",
    "/shows?featured=true&featured=false",
    "/shows?limit=25",
  ])("rejects invalid search and directory parameters at %s", async (path) => {
    expect((await fetch(`${baseUrl}${path}`)).status).toBe(400);
    expect(prisma.show.findMany).not.toHaveBeenCalled();
    expect(prisma.episode.findMany).not.toHaveBeenCalled();
  });
});
