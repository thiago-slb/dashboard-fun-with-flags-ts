import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";

type PermissionTuple = {
  resource: string;
  action: string;
};

export type FeatureFlagAccessAction = "read" | "write";

export function hasFeatureFlagAccess(
  action: FeatureFlagAccessAction,
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasReadPermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.featureFlagsRead.resource &&
      permission.action === PERMISSIONS.featureFlagsRead.action,
  );
  const hasWritePermission = permissions.some(
    (permission) =>
      permission.resource === PERMISSIONS.featureFlagsWrite.resource &&
      permission.action === PERMISSIONS.featureFlagsWrite.action,
  );

  if (action === "write") {
    return hasWritePermission;
  }

  return hasReadPermission || hasWritePermission;
}
