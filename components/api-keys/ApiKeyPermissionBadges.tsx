import { Badge } from "@/components/ui/Badge";

type ApiKeyPermissionBadgesProps = {
  canReadFeatureFlags: boolean;
  canWriteFeatureFlags: boolean;
  canReadEnvironments: boolean;
  canWriteEnvironments: boolean;
  canReadProjects: boolean;
  canWriteProjects: boolean;
  t: (key: string) => string;
};

export function ApiKeyPermissionBadges({
  canReadFeatureFlags,
  canWriteFeatureFlags,
  canReadEnvironments,
  canWriteEnvironments,
  canReadProjects,
  canWriteProjects,
  t,
}: ApiKeyPermissionBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {canReadFeatureFlags ? (
        <Badge variant="info">{t("apiKeys.permissions.featureFlagsReadShort")}</Badge>
      ) : null}
      {canWriteFeatureFlags ? (
        <Badge variant="success">{t("apiKeys.permissions.featureFlagsWriteShort")}</Badge>
      ) : null}
      {canReadEnvironments ? (
        <Badge variant="info">{t("apiKeys.permissions.environmentsReadShort")}</Badge>
      ) : null}
      {canWriteEnvironments ? (
        <Badge variant="success">{t("apiKeys.permissions.environmentsWriteShort")}</Badge>
      ) : null}
      {canReadProjects ? (
        <Badge variant="info">{t("apiKeys.permissions.projectsReadShort")}</Badge>
      ) : null}
      {canWriteProjects ? (
        <Badge variant="success">{t("apiKeys.permissions.projectsWriteShort")}</Badge>
      ) : null}
      {!canReadFeatureFlags &&
      !canWriteFeatureFlags &&
      !canReadEnvironments &&
      !canWriteEnvironments &&
      !canReadProjects &&
      !canWriteProjects ? (
        <Badge variant="neutral">{t("apiKeys.permissions.none")}</Badge>
      ) : null}
    </div>
  );
}
