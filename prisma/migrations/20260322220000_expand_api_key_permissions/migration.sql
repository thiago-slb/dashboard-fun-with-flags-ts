-- Add granular API key permissions for feature flags, environments and projects.
ALTER TABLE "ApiKey" ADD COLUMN "canWriteFeatureFlags" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApiKey" ADD COLUMN "canReadEnvironments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApiKey" ADD COLUMN "canWriteEnvironments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApiKey" ADD COLUMN "canReadProjects" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApiKey" ADD COLUMN "canWriteProjects" BOOLEAN NOT NULL DEFAULT false;
