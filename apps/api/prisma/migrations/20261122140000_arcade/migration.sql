CREATE TYPE "ArcadeKind" AS ENUM ('MOT', 'LINKS', 'RECALL');

CREATE TABLE "ArcadePuzzle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" "ArcadeKind" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "definition" JSONB NOT NULL,
    CONSTRAINT "ArcadePuzzle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArcadeRun" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "progress" JSONB NOT NULL,
    CONSTRAINT "ArcadeRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArcadePuzzle_slug_date_key" ON "ArcadePuzzle"("slug", "date");
CREATE INDEX "ArcadePuzzle_date_published_idx" ON "ArcadePuzzle"("date", "published");
CREATE UNIQUE INDEX "ArcadeRun_puzzleId_userId_key" ON "ArcadeRun"("puzzleId", "userId");
CREATE INDEX "ArcadeRun_userId_idx" ON "ArcadeRun"("userId");
ALTER TABLE "ArcadeRun" ADD CONSTRAINT "ArcadeRun_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "ArcadePuzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArcadeRun" ADD CONSTRAINT "ArcadeRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
