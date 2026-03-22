import { MASTER_ROLE_NAME } from "@/lib/auth/constants";

type PermissionTuple = {
  resource: string;
  action: string;
};

type MenuVisibilityRule = {
  resource: string;
  action: "read" | "write";
} | null;

export type MenuItemId =
  | "dashboard"
  | "featureFlags"
  | "apiKeys"
  | "environments"
  | "projects";

export type MenuIconName =
  | "dashboard"
  | "feature_flags"
  | "api_keys"
  | "environments"
  | "projects";

export type ResolvedMenuItem = {
  id: MenuItemId;
  href: string;
  labelKey: string;
  icon: MenuIconName;
};

const MENU_DEFINITIONS: Array<ResolvedMenuItem & { rule: MenuVisibilityRule }> = [
  {
    id: "dashboard",
    href: "/",
    labelKey: "sideMenu.dashboard",
    icon: "dashboard",
    rule: null,
  },
  {
    id: "featureFlags",
    href: "/feature-flags",
    labelKey: "sideMenu.featureFlags",
    icon: "feature_flags",
    rule: {
      resource: "feature_flags",
      action: "read",
    },
  },
  {
    id: "apiKeys",
    href: "/api-keys",
    labelKey: "sideMenu.apiKeys",
    icon: "api_keys",
    rule: {
      resource: "api_keys",
      action: "read",
    },
  },
  {
    id: "environments",
    href: "/environments",
    labelKey: "sideMenu.environments",
    icon: "environments",
    rule: {
      resource: "environments",
      action: "read",
    },
  },
  {
    id: "projects",
    href: "/projects",
    labelKey: "sideMenu.projects",
    icon: "projects",
    rule: {
      resource: "projects",
      action: "read",
    },
  },
];

function hasAccess(
  rule: MenuVisibilityRule,
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  if (!rule) {
    return true;
  }

  if (roleNames.includes(MASTER_ROLE_NAME)) {
    return true;
  }

  const hasRead = permissions.some(
    (permission) =>
      permission.resource === rule.resource && permission.action === "read",
  );
  const hasWrite = permissions.some(
    (permission) =>
      permission.resource === rule.resource && permission.action === "write",
  );

  if (rule.action === "write") {
    return hasWrite;
  }

  return hasRead || hasWrite;
}

export function resolveMenuItems(
  roleNames: string[],
  permissions: PermissionTuple[],
) {
  return MENU_DEFINITIONS.filter((item) =>
    hasAccess(item.rule, roleNames, permissions),
  ).map((item) => ({
    id: item.id,
    href: item.href,
    labelKey: item.labelKey,
    icon: item.icon,
  }));
}
