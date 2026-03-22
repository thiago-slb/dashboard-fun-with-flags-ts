import { type Dispatch, type SetStateAction } from "react";

export type ApiKeyPermissionsForm = {
  canReadFeatureFlags: boolean;
  canWriteFeatureFlags: boolean;
  canReadEnvironments: boolean;
  canWriteEnvironments: boolean;
  canReadProjects: boolean;
  canWriteProjects: boolean;
};

type ApiKeyPermissionsFieldsetProps = {
  value: ApiKeyPermissionsForm;
  onChange: Dispatch<SetStateAction<ApiKeyPermissionsForm>>;
  t: (key: string) => string;
};

function updatePermissionsState(
  prev: ApiKeyPermissionsForm,
  key: keyof ApiKeyPermissionsForm,
  checked: boolean,
) {
  const next = { ...prev, [key]: checked };

  if (key === "canReadFeatureFlags" && !checked) {
    next.canWriteFeatureFlags = false;
  }
  if (key === "canWriteFeatureFlags" && checked) {
    next.canReadFeatureFlags = true;
  }
  if (key === "canReadEnvironments" && !checked) {
    next.canWriteEnvironments = false;
  }
  if (key === "canWriteEnvironments" && checked) {
    next.canReadEnvironments = true;
  }
  if (key === "canReadProjects" && !checked) {
    next.canWriteProjects = false;
  }
  if (key === "canWriteProjects" && checked) {
    next.canReadProjects = true;
  }

  return next;
}

export function ApiKeyPermissionsFieldset({
  value,
  onChange,
  t,
}: ApiKeyPermissionsFieldsetProps) {
  return (
    <div className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 md:col-span-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t("apiKeys.permissionsTitle")}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canReadFeatureFlags}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canReadFeatureFlags", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.featureFlagsRead")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canWriteFeatureFlags}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canWriteFeatureFlags", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.featureFlagsWrite")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canReadEnvironments}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canReadEnvironments", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.environmentsRead")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canWriteEnvironments}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canWriteEnvironments", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.environmentsWrite")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canReadProjects}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canReadProjects", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.projectsRead")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.canWriteProjects}
            onChange={(event) =>
              onChange((prev) =>
                updatePermissionsState(prev, "canWriteProjects", event.target.checked),
              )
            }
          />
          {t("apiKeys.permissions.projectsWrite")}
        </label>
      </div>
    </div>
  );
}
