import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";

type PermissionTuple = {
  resource: string;
  action: string;
};

export type ProjectAccessAction = "read" | "write";

export function hasProjectAccess(
  action: ProjectAccessAction,
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasReadPermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.projectsRead.resource &&
      permission.action === PERMISSIONS.projectsRead.action,
  );
  const hasWritePermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.projectsWrite.resource &&
      permission.action === PERMISSIONS.projectsWrite.action,
  );

  if (action === "write") {
    return hasWritePermission;
  }

  return hasReadPermission || hasWritePermission;
}
