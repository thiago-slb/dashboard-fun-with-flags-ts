import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";

type PermissionTuple = {
  resource: string;
  action: string;
};

export type ExperimentAccessAction = "read" | "write";

export function hasExperimentAccess(
  action: ExperimentAccessAction,
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasReadPermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.experimentsRead.resource &&
      permission.action === PERMISSIONS.experimentsRead.action,
  );
  const hasWritePermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.experimentsWrite.resource &&
      permission.action === PERMISSIONS.experimentsWrite.action,
  );

  if (action === "write") {
    return hasWritePermission;
  }

  return hasReadPermission || hasWritePermission;
}

export function hasAnalyticsAccess(roleNames: string[], permissions: PermissionTuple[]) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  return permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.analyticsRead.resource &&
      permission.action === PERMISSIONS.analyticsRead.action,
  );
}
