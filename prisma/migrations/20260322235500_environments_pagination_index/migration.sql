-- Improve environments pagination and tenant-scoped listing performance.
CREATE INDEX "Environment_tenantId_id_idx" ON "Environment"("tenantId", "id");
