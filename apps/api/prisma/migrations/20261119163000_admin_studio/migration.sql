BEGIN;

CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'EDITOR');

CREATE TABLE "StaffAccount" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StaffAccount_email_key" ON "StaffAccount"("email");

CREATE TABLE "StaffSession" (
    "tokenHash" CHAR(64) PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffSession_accountId_fkey" FOREIGN KEY ("accountId")
      REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StaffSession_accountId_idx" ON "StaffSession"("accountId");
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

CREATE TABLE "StaffLoginThrottle" (
    "key" CHAR(64) PRIMARY KEY,
    "attempts" INTEGER NOT NULL,
    "windowEndsAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "StaffLoginThrottle_windowEndsAt_idx" ON "StaffLoginThrottle"("windowEndsAt");

ALTER TABLE "Show" ADD COLUMN "firstPublishedAt" TIMESTAMP(3);
ALTER TABLE "Episode" ADD COLUMN "firstPublishedAt" TIMESTAMP(3);

UPDATE "Show" SET "firstPublishedAt" = "createdAt" WHERE "status" IN ('PUBLISHED', 'ARCHIVED');
UPDATE "Episode" SET "firstPublishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "status" IN ('PUBLISHED', 'ARCHIVED');

COMMIT;
