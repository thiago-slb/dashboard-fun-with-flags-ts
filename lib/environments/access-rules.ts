import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";

type PermissionTuple = {
  resource: string;
  action: string;
};

export type EnvironmentAccessAction = "read" | "write";

export function hasEnvironmentAccess(
  action: EnvironmentAccessAction,
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasReadPermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.environmentsRead.resource &&
      permission.action === PERMISSIONS.environmentsRead.action,
  );
  const hasWritePermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.environmentsWrite.resource &&
      permission.action === PERMISSIONS.environmentsWrite.action,
  );

  if (action === "write") {
    return hasWritePermission;
  }

  return hasReadPermission || hasWritePermission;
}
