CREATE TABLE "DailyQuizProgress" (
  "gameId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "gameRevision" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL,
  CONSTRAINT "DailyQuizProgress_pkey" PRIMARY KEY ("gameId", "userId", "date")
);
CREATE INDEX "DailyQuizProgress_userId_idx" ON "DailyQuizProgress"("userId");
ALTER TABLE "DailyQuizProgress" ADD CONSTRAINT "DailyQuizProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyQuizProgress" ADD CONSTRAINT "DailyQuizProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
