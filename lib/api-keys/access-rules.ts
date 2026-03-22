import { MASTER_ROLE_NAME } from "@/lib/auth/constants";

type PermissionTuple = {
  resource: string;
  action: string;
};

export function hasApiKeyAccess(
  mode: "read" | "write",
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasRead = permissions.some(
    (permission) =>
      permission.resource === "api_keys" && permission.action === "read",
  );
  const hasWrite = permissions.some(
    (permission) =>
      permission.resource === "api_keys" && permission.action === "write",
  );

  if (mode === "write") {
    return hasWrite;
  }

  return hasRead || hasWrite;
}
