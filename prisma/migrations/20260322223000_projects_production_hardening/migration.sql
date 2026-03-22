-- Performance index for projects listings and access checks.
CREATE INDEX IF NOT EXISTS "Membership_userId_status_id_idx" ON "Membership"("userId", "status", "id");

-- Backfill default tenant permissions for existing tenants and grant all to MASTER role.
INSERT INTO "Permission" ("id", "tenantId", "resource", "action", "description", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), t."id", p."resource", p."action", p."description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (
  SELECT 'projects' AS "resource", 'read' AS "action", 'projects:read' AS "description"
  UNION ALL SELECT 'projects', 'write', 'projects:write'
  UNION ALL SELECT 'feature_flags', 'read', 'feature_flags:read'
  UNION ALL SELECT 'feature_flags', 'write', 'feature_flags:write'
  UNION ALL SELECT 'environments', 'read', 'environments:read'
  UNION ALL SELECT 'environments', 'write', 'environments:write'
  UNION ALL SELECT 'api_keys', 'read', 'api_keys:read'
  UNION ALL SELECT 'api_keys', 'write', 'api_keys:write'
) p
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" existing
  WHERE existing."tenantId" = t."id"
    AND existing."resource" = p."resource"
    AND existing."action" = p."action"
);

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT lower(hex(randomblob(16))), r."id", perm."id", CURRENT_TIMESTAMP
FROM "Role" r
JOIN "Permission" perm ON perm."tenantId" = r."tenantId"
WHERE r."name" = 'MASTER'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r."id"
      AND rp."permissionId" = perm."id"
  );
