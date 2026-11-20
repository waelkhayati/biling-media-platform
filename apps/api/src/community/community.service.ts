import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CommentCreate,
  CommentListQuery,
  CommentReportInput,
  CommentUpdate,
  CommunityTarget,
  ModerationAction,
  ModerationQuery,
  CommunityComment,
  CommunityCommentList,
} from "@biling/contracts";
import { PrismaService } from "../database/prisma.service";

const author = { id: true, username: true, displayName: true, avatarUrl: true } as const;
const pageSize = 30;

function publicAuthor(value: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: value.id,
    username: value.username ?? "member",
    displayName: value.displayName ?? value.username ?? "Biling member",
    avatarUrl: value.avatarUrl,
  };
}

@Injectable()
export class CommunityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async target(target: CommunityTarget) {
    if (target.type === "article") {
      const row = await this.prisma.article.findFirst({
        where: { slug: target.slug, status: "PUBLISHED", publishedAt: { not: null } },
        select: { id: true },
      });
      if (!row) throw new NotFoundException("Published article not found.");
      return { articleId: row.id, episodeId: null, showId: null };
    }
    if (target.type === "show") {
      const row = await this.prisma.show.findFirst({
        where: { slug: target.slug, status: "PUBLISHED" },
        select: { id: true },
      });
      if (!row) throw new NotFoundException("Published production not found.");
      return { articleId: null, episodeId: null, showId: row.id };
    }
    const row = await this.prisma.episode.findFirst({
      where: {
        slug: target.slug,
        status: "PUBLISHED",
        publishedAt: { not: null },
        show: { slug: target.showSlug, status: "PUBLISHED" },
      },
      select: { id: true },
    });
    if (!row) throw new NotFoundException("Published episode not found.");
    return { articleId: null, episodeId: row.id, showId: null };
  }

  async comments(query: CommentListQuery, userId?: string): Promise<CommunityCommentList> {
    const { sort, page, limit, ...targetInput } = query;
    const target = await this.target(targetInput as CommunityTarget);
    const rows = await this.prisma.communityComment.findMany({
      where: { ...target, parentId: null, status: "VISIBLE" },
      include: {
        user: { select: author },
        replies: {
          where: { status: "VISIBLE" },
          include: { user: { select: author } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [
        { createdAt: sort === "newest" ? "desc" : "asc" },
        { id: sort === "newest" ? "desc" : "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit + 1,
    });
    const serialize = (
      row: (typeof rows)[number] | (typeof rows)[number]["replies"][number],
    ): CommunityComment => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      owned: row.userId === userId,
      author: publicAuthor(row.user),
      replies: "replies" in row ? row.replies.map((reply) => serialize(reply)) : [],
    });
    return { items: rows.slice(0, limit).map(serialize), page, hasMore: rows.length > limit };
  }

  async create(input: CommentCreate, userId: string) {
    const target = await this.target(input.target);
    if (input.parentId) {
      const parent = await this.prisma.communityComment.findFirst({
        where: { id: input.parentId, parentId: null, status: "VISIBLE", ...target },
        select: { id: true },
      });
      if (!parent)
        throw new ConflictException("Replies can only be added to a visible top-level comment.");
    }
    const row = await this.prisma.communityComment.create({
      data: { ...target, parentId: input.parentId, body: input.body, userId },
      include: { user: { select: author } },
    });
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      owned: true,
      author: publicAuthor(row.user),
      replies: [],
    };
  }

  async update(id: string, input: CommentUpdate, userId: string) {
    const result = await this.prisma.communityComment.updateMany({
      where: { id, userId, status: "VISIBLE" },
      data: { body: input.body },
    });
    if (!result.count) throw new ForbiddenException("You can only edit your own visible comments.");
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.communityComment.updateMany({
      where: { id, userId, status: "VISIBLE" },
      data: { status: "REMOVED", body: "[deleted]" },
    });
    if (!result.count)
      throw new ForbiddenException("You can only delete your own visible comments.");
  }

  async report(id: string, input: CommentReportInput, userId: string) {
    const comment = await this.prisma.communityComment.findFirst({
      where: { id, status: "VISIBLE", userId: { not: userId } },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException("Comment not found or cannot be reported.");
    await this.prisma.commentReport.upsert({
      where: { commentId_reporterId: { commentId: id, reporterId: userId } },
      create: { commentId: id, reporterId: userId, ...input },
      update: { ...input, status: "OPEN" },
    });
  }

  async engagement(targetInput: CommunityTarget, userId?: string) {
    const target = await this.target(targetInput);
    if (target.articleId) {
      const [likeCount, mine] = await Promise.all([
        this.prisma.articleReaction.count({ where: { articleId: target.articleId, type: "LIKE" } }),
        userId
          ? this.prisma.articleReaction.findUnique({
              where: {
                userId_articleId_type: { userId, articleId: target.articleId, type: "LIKE" },
              },
              select: { userId: true },
            })
          : null,
      ]);
      return { likeCount, liked: !!mine, followerCount: 0, followed: false };
    }
    if (target.episodeId) {
      const [likeCount, mine] = await Promise.all([
        this.prisma.episodeReaction.count({ where: { episodeId: target.episodeId, type: "LIKE" } }),
        userId
          ? this.prisma.episodeReaction.findUnique({
              where: {
                userId_episodeId_type: { userId, episodeId: target.episodeId, type: "LIKE" },
              },
              select: { userId: true },
            })
          : null,
      ]);
      return { likeCount, liked: !!mine, followerCount: 0, followed: false };
    }
    const [followerCount, mine] = await Promise.all([
      this.prisma.showFollow.count({ where: { showId: target.showId! } }),
      userId
        ? this.prisma.showFollow.findUnique({
            where: { userId_showId: { userId, showId: target.showId! } },
            select: { userId: true },
          })
        : null,
    ]);
    return { likeCount: 0, liked: false, followerCount, followed: !!mine };
  }

  async setLike(targetInput: CommunityTarget, userId: string, value: boolean) {
    const target = await this.target(targetInput);
    if (!target.articleId && !target.episodeId)
      throw new ConflictException("Likes are available for articles and episodes.");
    if (target.articleId) {
      if (value)
        await this.prisma.articleReaction.upsert({
          where: { userId_articleId_type: { userId, articleId: target.articleId, type: "LIKE" } },
          create: { userId, articleId: target.articleId },
          update: {},
        });
      else
        await this.prisma.articleReaction.deleteMany({
          where: { userId, articleId: target.articleId, type: "LIKE" },
        });
    } else {
      if (value)
        await this.prisma.episodeReaction.upsert({
          where: { userId_episodeId_type: { userId, episodeId: target.episodeId!, type: "LIKE" } },
          create: { userId, episodeId: target.episodeId! },
          update: {},
        });
      else
        await this.prisma.episodeReaction.deleteMany({
          where: { userId, episodeId: target.episodeId!, type: "LIKE" },
        });
    }
    return this.engagement(targetInput, userId);
  }

  async setFollow(slug: string, userId: string, value: boolean) {
    const targetInput = { type: "show" as const, slug };
    const target = await this.target(targetInput);
    if (value)
      await this.prisma.showFollow.upsert({
        where: { userId_showId: { userId, showId: target.showId! } },
        create: { userId, showId: target.showId! },
        update: {},
      });
    else await this.prisma.showFollow.deleteMany({ where: { userId, showId: target.showId! } });
    return this.engagement(targetInput, userId);
  }

  async followed(userId: string) {
    const rows = await this.prisma.showFollow.findMany({
      where: { userId, show: { status: "PUBLISHED" } },
      include: { show: true },
      orderBy: [{ createdAt: "desc" }, { showId: "desc" }],
    });
    return rows.map(({ show, createdAt }) => ({
      id: show.id,
      slug: show.slug,
      title: show.title,
      description: show.description,
      posterUrl: show.posterUrl,
      followedAt: createdAt.toISOString(),
    }));
  }

  async moderation({ status, page }: ModerationQuery) {
    const rows = await this.prisma.communityComment.findMany({
      where: { reports: { some: status ? { status } : {} } },
      include: {
        user: { select: author },
        article: { select: { slug: true } },
        episode: { select: { slug: true, show: { select: { slug: true } } } },
        show: { select: { slug: true } },
        reports: {
          where: status ? { status } : {},
          include: { reporter: { select: { username: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    const history = await this.prisma.communityModerationEvent.findMany({
      where: { commentId: { in: rows.slice(0, pageSize).map((row) => row.id) } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const byComment = new Map<string, typeof history>();
    for (const event of history)
      byComment.set(event.commentId, [...(byComment.get(event.commentId) ?? []), event]);
    return {
      items: rows
        .slice(0, pageSize)
        .map((row) => ({
          id: row.id,
          body: row.body,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          author: publicAuthor(row.user),
          reports: row.reports.map((report) => ({
            id: report.id,
            reason: report.reason,
            details: report.details,
            status: report.status,
            createdAt: report.createdAt.toISOString(),
            reporter: { username: report.reporter.username ?? "member" },
          })),
          target: row.article
            ? { type: "article" as const, slug: row.article.slug }
            : row.episode
              ? {
                  type: "episode" as const,
                  showSlug: row.episode.show.slug,
                  slug: row.episode.slug,
                }
              : { type: "show" as const, slug: row.show!.slug },
          history: (byComment.get(row.id) ?? []).map((event) => ({
            id: event.id,
            actor: event.actor,
            action: event.action,
            note: event.note,
            createdAt: event.createdAt.toISOString(),
          })),
        })),
      page,
      hasMore: rows.length > pageSize,
    };
  }

  async moderate(id: string, input: ModerationAction, actor: { id: string; email: string }) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException("Comment not found.");
    await this.prisma.$transaction(async (tx) => {
      if (input.action === "DISMISS_REPORTS")
        await tx.commentReport.updateMany({
          where: { commentId: id, status: "OPEN" },
          data: { status: "DISMISSED" },
        });
      else {
        const status =
          input.action === "HIDE" ? "HIDDEN" : input.action === "RESTORE" ? "VISIBLE" : "REMOVED";
        await tx.communityComment.update({
          where: { id },
          data: { status, ...(status === "REMOVED" && { body: "[removed by moderation]" }) },
        });
        await tx.commentReport.updateMany({
          where: { commentId: id, status: "OPEN" },
          data: { status: "REVIEWED" },
        });
      }
      await tx.communityModerationEvent.create({
        data: {
          actorId: actor.id,
          actor: actor.email,
          commentId: id,
          action: input.action,
          note: input.note,
        },
      });
    });
  }
}
