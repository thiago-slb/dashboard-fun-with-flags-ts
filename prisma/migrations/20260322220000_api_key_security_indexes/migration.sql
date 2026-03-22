-- CreateIndex
CREATE INDEX "ApiKey_tenantId_secretHash_deletedAt_idx" ON "ApiKey"("tenantId", "secretHash", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_secretHash_key" ON "ApiKey"("secretHash");
