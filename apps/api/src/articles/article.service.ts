import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StaffIdentity } from "@biling/contracts";
import {
  articleDetailSchema,
  articleListSchema,
  articleSitemapSchema,
  articleSummarySchema,
  studioArticleSchema,
  type ArticleInput,
  type ArticleQuery,
  type ArticleUpdate,
  type StudioArticleQuery,
} from "@biling/schemas";
import { authorizeStatus, writeStudioChange } from "../admin/studio-write";
import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";

const published = { status: "PUBLISHED", publishedAt: { not: null } } as const;
const order = [
  { publishedAt: "desc" },
  { id: "desc" },
] satisfies Prisma.ArticleOrderByWithRelationInput[];
const summary = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  author: true,
  category: true,
  tags: true,
  language: true,
  imageUrl: true,
  imageAlt: true,
  imageCaption: true,
  imageCredit: true,
  featured: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;
type SummaryRow = Prisma.ArticleGetPayload<{ select: typeof summary }>;
const associations = {
  shows: { select: { id: true } },
  episodes: { select: { id: true } },
} as const;
type StudioRow = Prisma.ArticleGetPayload<{ include: typeof associations }>;

function summaryData(row: SummaryRow) {
  return {
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function studioArticle({ shows, episodes, ...row }: StudioRow) {
  return studioArticleSchema.parse({
    ...summaryData(row),
    createdAt: row.createdAt.toISOString(),
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    showIds: shows.map(({ id }) => id),
    episodeIds: episodes.map(({ id }) => id),
  });
}

async function articleData(
  tx: Prisma.TransactionClient,
  { showIds, episodeIds, ...fields }: ArticleInput,
) {
  const shows = [...new Set(showIds)].map((id) => ({ id }));
  const episodes = [...new Set(episodeIds)].map((id) => ({ id }));
  const [showCount, episodeCount] = await Promise.all([
    shows.length ? tx.show.count({ where: { OR: shows } }) : 0,
    episodes.length ? tx.episode.count({ where: { OR: episodes } }) : 0,
  ]);
  if (showCount !== shows.length || episodeCount !== episodes.length)
    throw new BadRequestException("Choose existing shows and episodes.");
  return { fields, shows, episodes };
}

export async function searchArticles(prisma: PrismaService, query: string, take: number) {
  const pattern = { contains: query.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } as const;
  const rows = await prisma.article.findMany({
    where: {
      ...published,
      OR: [{ title: pattern }, { excerpt: pattern }, { author: pattern }, { category: pattern }],
    },
    select: summary,
    orderBy: order,
    take,
  });
  return rows.map((row) => articleSummarySchema.parse(summaryData(row)));
}

@Injectable()
export class ArticleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list({ page, limit, category, tag, show, episode, featured }: ArticleQuery) {
    const showFilter = { slug: show, status: "PUBLISHED" } as const;
    const where: Prisma.ArticleWhereInput = {
      ...published,
      category,
      featured: featured ? true : undefined,
      tags: tag ? { has: tag } : undefined,
      shows: show && !episode ? { some: showFilter } : undefined,
      episodes: episode ? { some: { ...published, slug: episode, show: showFilter } } : undefined,
    };
    const [rows, categories] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: summary,
        orderBy: order,
        take: limit + 1,
        skip: (page - 1) * limit,
      }),
      this.prisma.article.groupBy({
        by: ["category"],
        where: published,
        orderBy: { category: "asc" },
        take: 100,
      }),
    ]);
    return articleListSchema.parse({
      items: rows.slice(0, limit).map(summaryData),
      page,
      hasMore: rows.length > limit,
      categories: categories.map(({ category }) => category),
    });
  }

  async sitemap() {
    const rows = await this.prisma.article.findMany({
      where: published,
      select: { slug: true, updatedAt: true },
      orderBy: order,
      take: 49_997,
    });
    return articleSitemapSchema.parse(
      rows.map(({ slug, updatedAt }) => ({ slug, updatedAt: updatedAt.toISOString() })),
    );
  }

  async detail(slug: string) {
    const row = await this.prisma.article.findUnique({
      where: { slug, ...published },
      select: {
        ...summary,
        body: true,
        shows: { where: { status: "PUBLISHED" }, select: { title: true, slug: true } },
        episodes: {
          where: { ...published, show: { status: "PUBLISHED" } },
          select: { title: true, slug: true, show: { select: { slug: true } } },
        },
      },
    });
    if (!row) throw new NotFoundException("Article not found.");
    const { episodes, shows, body, ...fields } = row;
    const related = await this.prisma.article.findMany({
      where: {
        ...published,
        id: { not: row.id },
        OR: [{ category: row.category }, { tags: { hasSome: row.tags } }],
      },
      select: summary,
      orderBy: order,
      take: 3,
    });
    return articleDetailSchema.parse({
      ...summaryData(fields),
      body,
      shows,
      related: related.map(summaryData),
      episodes: episodes.map(({ title, slug, show }) => ({ title, slug, showSlug: show.slug })),
    });
  }

  async studioList({ page, status, category, author }: StudioArticleQuery) {
    const rows = await this.prisma.article.findMany({
      where: {
        status,
        category: category ? { equals: category, mode: "insensitive" } : undefined,
        author: author ? { equals: author, mode: "insensitive" } : undefined,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        author: true,
        status: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 51,
      skip: (page - 1) * 50,
    });
    return {
      items: rows.slice(0, 50).map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
      page,
      hasMore: rows.length > 50,
    };
  }

  async options() {
    const [shows, episodes, authors, categories] = await Promise.all([
      this.prisma.show.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
      this.prisma.episode.findMany({
        orderBy: [{ show: { title: "asc" } }, { title: "asc" }],
        select: { id: true, title: true, show: { select: { title: true } } },
      }),
      this.prisma.article.groupBy({ by: ["author"], orderBy: { author: "asc" }, take: 100 }),
      this.prisma.article.groupBy({ by: ["category"], orderBy: { category: "asc" }, take: 100 }),
    ]);
    return {
      shows,
      authors: authors.map(({ author }) => author),
      categories: categories.map(({ category }) => category),
      episodes: episodes.map(({ show, ...row }) => ({ ...row, showTitle: show.title })),
    };
  }

  async studioDetail(id: string) {
    return studioArticle(await this.find(id));
  }

  async create(input: ArticleInput, actor: StaffIdentity) {
    authorizeStatus(actor.role, input.status);
    const date = input.status === "PUBLISHED" ? new Date() : null;
    const row = await writeStudioChange(this.prisma, actor, "ARTICLE", null, async (tx) => {
      const { fields, shows, episodes } = await articleData(tx, input);
      return tx.article.create({
        data: {
          ...fields,
          firstPublishedAt: date,
          publishedAt: date,
          shows: { connect: shows },
          episodes: { connect: episodes },
        },
        include: associations,
      });
    });
    return studioArticle(row);
  }

  async update(id: string, { revision, ...input }: ArticleUpdate, actor: StaffIdentity) {
    const current = await this.find(id);
    authorizeStatus(actor.role, input.status, current.status);
    if (current.firstPublishedAt && current.slug !== input.slug)
      throw new ConflictException("This article has been published. Its public slug is locked.");
    const date = input.status === "PUBLISHED" ? (current.firstPublishedAt ?? new Date()) : null;
    const row = await writeStudioChange(
      this.prisma,
      actor,
      "ARTICLE",
      current.status,
      async (tx) => {
        const { fields, shows, episodes } = await articleData(tx, input);
        return tx.article.update({
          where: { id, updatedAt: new Date(revision) },
          data: {
            ...fields,
            firstPublishedAt: current.firstPublishedAt ?? date,
            publishedAt: date,
            updatedAt: new Date(Math.max(current.updatedAt.getTime() + 1, Date.now())),
            shows: { set: shows },
            episodes: { set: episodes },
          },
          include: associations,
        });
      },
    );
    return studioArticle(row);
  }

  private async find(id: string) {
    const row = await this.prisma.article.findUnique({ where: { id }, include: associations });
    if (!row) throw new NotFoundException("Article not found.");
    return row;
  }
}
