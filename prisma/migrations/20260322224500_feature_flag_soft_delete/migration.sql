-- AlterTable
ALTER TABLE "FeatureFlag" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "FeatureFlag_tenantId_deletedAt_idx" ON "FeatureFlag"("tenantId", "deletedAt");
