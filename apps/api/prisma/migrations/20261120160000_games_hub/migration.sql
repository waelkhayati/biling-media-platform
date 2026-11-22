CREATE TYPE "GameType" AS ENUM ('TRIVIA', 'PERSONALITY', 'DAILY_CHALLENGE');

CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "artworkUrl" TEXT,
    "type" "GameType" NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "timeLimitSeconds" INTEGER,
    "firstPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE INDEX "Game_status_type_createdAt_idx" ON "Game"("status", "type", "createdAt");
CREATE INDEX "Game_status_featured_createdAt_idx" ON "Game"("status", "featured", "createdAt");

CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "explanation" VARCHAR(2000),
    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameQuestion_gameId_position_key" ON "GameQuestion"("gameId", "position");

CREATE TABLE "GameOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "outcomeKey" VARCHAR(80),
    CONSTRAINT "GameOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameOption_questionId_position_key" ON "GameOption"("questionId", "position");

CREATE TABLE "GameOutcome" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "imageUrl" TEXT,
    CONSTRAINT "GameOutcome_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameOutcome_gameId_key_key" ON "GameOutcome"("gameId", "key");

CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "dailyDate" VARCHAR(10),
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "outcomeKey" VARCHAR(80),
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GameAttempt_gameId_userId_dailyDate_key" ON "GameAttempt"("gameId", "userId", "dailyDate");
CREATE INDEX "GameAttempt_userId_completedAt_idx" ON "GameAttempt"("userId", "completedAt");
CREATE INDEX "GameAttempt_gameId_official_completedAt_idx" ON "GameAttempt"("gameId", "official", "completedAt");

ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameOption" ADD CONSTRAINT "GameOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameOutcome" ADD CONSTRAINT "GameOutcome_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
