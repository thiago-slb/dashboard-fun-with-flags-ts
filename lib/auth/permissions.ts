import type { Prisma } from "@prisma/client";

export const PERMISSIONS = {
  projectsRead: { resource: "projects", action: "read" },
  projectsWrite: { resource: "projects", action: "write" },
  featureFlagsRead: { resource: "feature_flags", action: "read" },
  featureFlagsWrite: { resource: "feature_flags", action: "write" },
  environmentsRead: { resource: "environments", action: "read" },
  environmentsWrite: { resource: "environments", action: "write" },
  apiKeysRead: { resource: "api_keys", action: "read" },
  apiKeysWrite: { resource: "api_keys", action: "write" },
  experimentsRead: { resource: "experiments", action: "read" },
  experimentsWrite: { resource: "experiments", action: "write" },
  analyticsRead: { resource: "analytics", action: "read" },
} as const;

const DEFAULT_TENANT_PERMISSIONS = Object.values(PERMISSIONS);

export async function ensureTenantDefaultPermissions(
  tx: Prisma.TransactionClient,
  tenantId: string,
  masterRoleId: string,
) {
  const existingPermissions = await tx.permission.findMany({
    where: {
      tenantId,
      OR: DEFAULT_TENANT_PERMISSIONS.map((permission) => ({
        resource: permission.resource,
        action: permission.action,
      })),
    },
    select: { resource: true, action: true },
  });

  const existingPermissionKeys = new Set(
    existingPermissions.map((permission) => `${permission.resource}:${permission.action}`),
  );

  const missingPermissions = DEFAULT_TENANT_PERMISSIONS.filter(
    (permission) =>
      !existingPermissionKeys.has(`${permission.resource}:${permission.action}`),
  );

  if (missingPermissions.length > 0) {
    await tx.permission.createMany({
      data: missingPermissions.map((permission) => ({
        tenantId,
        resource: permission.resource,
        action: permission.action,
        description: `${permission.resource}:${permission.action}`,
      })),
    });
  }

  const permissions = await tx.permission.findMany({
    where: {
      tenantId,
      OR: DEFAULT_TENANT_PERMISSIONS.map((permission) => ({
        resource: permission.resource,
        action: permission.action,
      })),
    },
    select: { id: true },
  });

  if (permissions.length === 0) {
    return;
  }

  const existingRolePermissions = await tx.rolePermission.findMany({
    where: {
      roleId: masterRoleId,
      permissionId: { in: permissions.map((permission) => permission.id) },
    },
    select: { permissionId: true },
  });

  const existingPermissionIds = new Set(
    existingRolePermissions.map((entry) => entry.permissionId),
  );
  const missingRolePermissions = permissions
    .filter((permission) => !existingPermissionIds.has(permission.id))
    .map((permission) => ({
      roleId: masterRoleId,
      permissionId: permission.id,
    }));

  if (missingRolePermissions.length > 0) {
    await tx.rolePermission.createMany({
      data: missingRolePermissions,
    });
  }
}
