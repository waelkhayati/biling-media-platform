CREATE TYPE "CommunityCommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');
CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE');
CREATE TYPE "CommentReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATEFUL', 'SEXUAL', 'VIOLENCE', 'MISINFORMATION', 'OTHER');
CREATE TYPE "CommentReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

CREATE TABLE "CommunityComment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "articleId" TEXT, "episodeId" TEXT,
  "showId" TEXT, "parentId" TEXT, "body" VARCHAR(2000) NOT NULL,
  "status" "CommunityCommentStatus" NOT NULL DEFAULT 'VISIBLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityComment_one_target" CHECK (num_nonnulls("articleId", "episodeId", "showId") = 1)
);
CREATE TABLE "CommentReport" (
  "id" TEXT NOT NULL, "commentId" TEXT NOT NULL, "reporterId" TEXT NOT NULL,
  "reason" "CommentReportReason" NOT NULL, "details" VARCHAR(500),
  "status" "CommentReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ArticleReaction" (
  "userId" TEXT NOT NULL, "articleId" TEXT NOT NULL,
  "type" "CommunityReactionType" NOT NULL DEFAULT 'LIKE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("userId", "articleId", "type")
);
CREATE TABLE "EpisodeReaction" (
  "userId" TEXT NOT NULL, "episodeId" TEXT NOT NULL,
  "type" "CommunityReactionType" NOT NULL DEFAULT 'LIKE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EpisodeReaction_pkey" PRIMARY KEY ("userId", "episodeId", "type")
);
CREATE TABLE "ShowFollow" (
  "userId" TEXT NOT NULL, "showId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowFollow_pkey" PRIMARY KEY ("userId", "showId")
);
CREATE TABLE "CommunityModerationEvent" (
  "id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actor" TEXT NOT NULL, "commentId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "note" VARCHAR(500), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentReport_commentId_reporterId_key" ON "CommentReport"("commentId", "reporterId");
CREATE INDEX "CommunityComment_articleId_status_createdAt_id_idx" ON "CommunityComment"("articleId", "status", "createdAt", "id");
CREATE INDEX "CommunityComment_episodeId_status_createdAt_id_idx" ON "CommunityComment"("episodeId", "status", "createdAt", "id");
CREATE INDEX "CommunityComment_showId_status_createdAt_id_idx" ON "CommunityComment"("showId", "status", "createdAt", "id");
CREATE INDEX "CommunityComment_parentId_status_createdAt_id_idx" ON "CommunityComment"("parentId", "status", "createdAt", "id");
CREATE INDEX "CommunityComment_userId_createdAt_idx" ON "CommunityComment"("userId", "createdAt");
CREATE INDEX "CommentReport_status_createdAt_id_idx" ON "CommentReport"("status", "createdAt", "id");
CREATE INDEX "ArticleReaction_articleId_type_idx" ON "ArticleReaction"("articleId", "type");
CREATE INDEX "EpisodeReaction_episodeId_type_idx" ON "EpisodeReaction"("episodeId", "type");
CREATE INDEX "ShowFollow_showId_idx" ON "ShowFollow"("showId");
CREATE INDEX "CommunityModerationEvent_commentId_createdAt_id_idx" ON "CommunityModerationEvent"("commentId", "createdAt", "id");
CREATE INDEX "CommunityModerationEvent_createdAt_id_idx" ON "CommunityModerationEvent"("createdAt", "id");

ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpisodeReaction" ADD CONSTRAINT "EpisodeReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpisodeReaction" ADD CONSTRAINT "EpisodeReaction_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowFollow" ADD CONSTRAINT "ShowFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowFollow" ADD CONSTRAINT "ShowFollow_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
