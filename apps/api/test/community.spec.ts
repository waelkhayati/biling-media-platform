import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CommunityService } from "../src/community/community.service";

const now = new Date("2026-11-20T12:00:00.000Z");
const user = { id: "user-1", username: "viewer", displayName: "Viewer", avatarUrl: null };
const prisma = {
  article: { findFirst: jest.fn() },
  episode: { findFirst: jest.fn() },
  show: { findFirst: jest.fn() },
  communityComment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  commentReport: { upsert: jest.fn(), updateMany: jest.fn() },
  articleReaction: {
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  episodeReaction: {
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  showFollow: {
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  communityModerationEvent: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

describe("CommunityService", () => {
  const service = new CommunityService(prisma as never);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((work: (tx: typeof prisma) => unknown) => work(prisma));
    prisma.article.findFirst.mockResolvedValue({ id: "article-1" });
    prisma.episode.findFirst.mockResolvedValue({ id: "episode-1" });
    prisma.show.findFirst.mockResolvedValue({ id: "show-1" });
    prisma.articleReaction.count.mockResolvedValue(1);
    prisma.episodeReaction.count.mockResolvedValue(1);
    prisma.showFollow.count.mockResolvedValue(1);
  });

  it("lists only visible comments and serializes a bounded reply level", async () => {
    prisma.communityComment.findMany.mockResolvedValue([
      {
        id: "comment-1",
        userId: user.id,
        body: "Top level",
        status: "VISIBLE",
        createdAt: now,
        updatedAt: now,
        user,
        replies: [
          {
            id: "reply-1",
            userId: "user-2",
            body: "Reply",
            createdAt: now,
            updatedAt: now,
            user: { ...user, id: "user-2" },
          },
        ],
      },
    ]);
    const result = await service.comments(
      { type: "article", slug: "story", sort: "newest", page: 1, limit: 20 },
      user.id,
    );
    expect(result.items[0]).toMatchObject({
      body: "Top level",
      owned: true,
      replies: [{ body: "Reply", owned: false }],
    });
    expect(prisma.communityComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          articleId: "article-1",
          parentId: null,
          status: "VISIBLE",
        }),
        take: 21,
      }),
    );
  });

  it("rejects replies to replies and interactions with unpublished content", async () => {
    prisma.communityComment.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        { target: { type: "show", slug: "show" }, body: "Hello", parentId: "reply-id" },
        user.id,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    prisma.show.findFirst.mockResolvedValue(null);
    await expect(
      service.engagement({ type: "show", slug: "draft" }, user.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enforces ownership when editing and deleting", async () => {
    prisma.communityComment.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update("other-comment", { body: "Changed" }, user.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove("other-comment", user.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("makes likes and follows idempotent through upsert and deleteMany", async () => {
    await service.setLike({ type: "article", slug: "story" }, user.id, true);
    await service.setLike({ type: "article", slug: "story" }, user.id, false);
    await service.setFollow("show", user.id, true);
    await service.setFollow("show", user.id, false);
    expect(prisma.articleReaction.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.articleReaction.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.showFollow.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.showFollow.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("records reports once per user and audits moderation in the same transaction", async () => {
    prisma.communityComment.findFirst.mockResolvedValue({ id: "comment-1" });
    await service.report("comment-1", { reason: "SPAM", details: null }, user.id);
    expect(prisma.commentReport.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { commentId_reporterId: { commentId: "comment-1", reporterId: user.id } },
      }),
    );
    prisma.communityComment.findUnique.mockResolvedValue({ id: "comment-1" });
    await service.moderate(
      "comment-1",
      { action: "HIDE", note: "Repeated spam" },
      { id: "staff-1", email: "editor@example.test" },
    );
    expect(prisma.communityComment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { status: "HIDDEN" },
    });
    expect(prisma.communityModerationEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "HIDE", actorId: "staff-1" }),
    });
  });
});
