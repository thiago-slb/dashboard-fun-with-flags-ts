/*
  Warnings:

  - Added the required column `environmentId` to the `FeatureFlag` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureFlag_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureFlag_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FeatureFlag_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FeatureFlag" ("createdAt", "createdByUserId", "description", "enabled", "id", "key", "name", "rolloutPercent", "tenantId", "updatedAt", "updatedByUserId") SELECT "createdAt", "createdByUserId", "description", "enabled", "id", "key", "name", "rolloutPercent", "tenantId", "updatedAt", "updatedByUserId" FROM "FeatureFlag";
DROP TABLE "FeatureFlag";
ALTER TABLE "new_FeatureFlag" RENAME TO "FeatureFlag";
CREATE INDEX "FeatureFlag_tenantId_environmentId_enabled_idx" ON "FeatureFlag"("tenantId", "environmentId", "enabled");
CREATE UNIQUE INDEX "FeatureFlag_tenantId_environmentId_key_key" ON "FeatureFlag"("tenantId", "environmentId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
