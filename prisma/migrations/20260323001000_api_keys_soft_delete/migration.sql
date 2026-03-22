ALTER TABLE "ApiKey"
ADD COLUMN "deletedAt" DATETIME;

CREATE INDEX "ApiKey_tenantId_deletedAt_id_idx"
ON "ApiKey"("tenantId", "deletedAt", "id");
