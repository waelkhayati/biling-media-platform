BEGIN;

CREATE TYPE "AudienceChallengeKind" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "biography" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "AudienceSession" (
  "tokenHash" CHAR(64) PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AudienceSession_userId_idx" ON "AudienceSession"("userId");
CREATE INDEX "AudienceSession_expiresAt_idx" ON "AudienceSession"("expiresAt");

CREATE TABLE "AudienceChallenge" (
  "tokenHash" CHAR(64) PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" "AudienceChallengeKind" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AudienceChallenge_userId_kind_key" ON "AudienceChallenge"("userId", "kind");
CREATE INDEX "AudienceChallenge_expiresAt_idx" ON "AudienceChallenge"("expiresAt");

CREATE TABLE "AudienceThrottle" (
  "key" CHAR(64) PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "windowEndsAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AudienceThrottle_windowEndsAt_idx" ON "AudienceThrottle"("windowEndsAt");

COMMIT;
