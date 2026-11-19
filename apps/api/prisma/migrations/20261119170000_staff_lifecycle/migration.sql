BEGIN;

CREATE TYPE "StaffChallengeKind" AS ENUM ('SETUP', 'RECOVERY', 'ENROLL', 'MFA');

ALTER TABLE "StaffAccount"
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mfaSecret" TEXT,
  ADD COLUMN "lastTotpStep" INTEGER;

-- Existing sessions were issued before MFA and must not survive the upgrade.
DELETE FROM "StaffSession";
ALTER TABLE "StaffSession" ADD COLUMN "authVersion" INTEGER NOT NULL;

CREATE TABLE "StaffChallenge" (
    "tokenHash" CHAR(64) PRIMARY KEY,
    "accountId" TEXT NOT NULL REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "kind" "StaffChallengeKind" NOT NULL,
    "authVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "secret" TEXT
);
CREATE INDEX "StaffChallenge_accountId_kind_idx" ON "StaffChallenge"("accountId", "kind");
CREATE INDEX "StaffChallenge_expiresAt_idx" ON "StaffChallenge"("expiresAt");

CREATE TABLE "StudioAuditEvent" (
    "id" TEXT PRIMARY KEY,
    "actorId" TEXT,
    "actor" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "ContentStatus",
    "nextStatus" "ContentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StudioAuditEvent_createdAt_id_idx" ON "StudioAuditEvent"("createdAt", "id");
CREATE INDEX "StudioAuditEvent_resource_createdAt_id_idx" ON "StudioAuditEvent"("resource", "createdAt", "id");

COMMIT;
