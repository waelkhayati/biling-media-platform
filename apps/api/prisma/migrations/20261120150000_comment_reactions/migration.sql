CREATE TABLE "CommentReaction" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("userId", "commentId", "type")
);

CREATE INDEX "CommentReaction_commentId_type_idx" ON "CommentReaction"("commentId", "type");

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
