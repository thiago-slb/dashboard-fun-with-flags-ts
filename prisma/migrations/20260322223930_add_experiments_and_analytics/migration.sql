-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "featureFlagId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "allocationMode" TEXT NOT NULL DEFAULT 'FIXED',
    "targetType" TEXT NOT NULL DEFAULT 'USER',
    "targetValue" TEXT,
    "segmentCountry" TEXT,
    "segmentDevice" TEXT NOT NULL DEFAULT 'ANY',
    "stickyBucketing" BOOLEAN NOT NULL DEFAULT true,
    "gradualRolloutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 100,
    "autoStart" BOOLEAN NOT NULL DEFAULT false,
    "autoStop" BOOLEAN NOT NULL DEFAULT false,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "goalEventName" TEXT NOT NULL DEFAULT 'signup_completed',
    "guardrailMaxErrorRate" REAL,
    "guardrailMinRevenue" REAL,
    "deletedAt" DATETIME,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experiment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Experiment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Experiment_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Experiment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Experiment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trafficPercent" INTEGER NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExperimentAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentAssignment_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExperimentVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT,
    "userKey" TEXT,
    "eventName" TEXT NOT NULL,
    "pagePath" TEXT,
    "featureKey" TEXT,
    "country" TEXT,
    "device" TEXT NOT NULL DEFAULT 'ANY',
    "revenue" REAL,
    "metadata" JSONB,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentEvent_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentEvent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExperimentVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Experiment_tenantId_environmentId_status_idx" ON "Experiment"("tenantId", "environmentId", "status");

-- CreateIndex
CREATE INDEX "Experiment_tenantId_deletedAt_id_idx" ON "Experiment"("tenantId", "deletedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_tenantId_environmentId_key_key" ON "Experiment"("tenantId", "environmentId", "key");

-- CreateIndex
CREATE INDEX "ExperimentVariant_experimentId_trafficPercent_idx" ON "ExperimentVariant"("experimentId", "trafficPercent");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVariant_experimentId_key_key" ON "ExperimentVariant"("experimentId", "key");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_tenantId_experimentId_variantId_idx" ON "ExperimentAssignment"("tenantId", "experimentId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_userKey_key" ON "ExperimentAssignment"("experimentId", "userKey");

-- CreateIndex
CREATE INDEX "ExperimentEvent_tenantId_experimentId_occurredAt_idx" ON "ExperimentEvent"("tenantId", "experimentId", "occurredAt");

-- CreateIndex
CREATE INDEX "ExperimentEvent_tenantId_eventName_occurredAt_idx" ON "ExperimentEvent"("tenantId", "eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "ExperimentEvent_tenantId_variantId_occurredAt_idx" ON "ExperimentEvent"("tenantId", "variantId", "occurredAt");
