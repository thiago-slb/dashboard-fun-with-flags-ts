"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import {
  useApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useUpdateApiKeyMutation,
} from "@/hooks/use-api-keys";
import { useEnvironmentsQuery } from "@/hooks/use-environments";

type ApiKeysPageClientProps = {
  userName: string;
  userEmail: string;
};

export function ApiKeysPageClient({ userName, userEmail }: ApiKeysPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState("");
  const [name, setName] = useState("");
  const [canReadFeatureFlags, setCanReadFeatureFlags] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);

  const apiKeysQuery = useApiKeysQuery();
  const environmentsQuery = useEnvironmentsQuery();
  const createMutation = useCreateApiKeyMutation();
  const updateMutation = useUpdateApiKeyMutation();
  const deleteMutation = useDeleteApiKeyMutation();

  async function handleCreate() {
    const created = await createMutation.mutateAsync({
      environmentId,
      name,
      canReadFeatureFlags,
      enabled,
    });
    setEnvironmentId("");
    setName("");
    setCanReadFeatureFlags(true);
    setEnabled(true);
    setRevealedApiKey(created.apiKey);
    setCreateModalOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#f8fbff] to-[#f4f6fb]">
      <SideMenu isOpen={sidebarOpen} />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-gray-900/50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={userName}
          userEmail={userEmail}
        />

        <main className="p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                API Keys
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage machine-to-machine access for reading feature flags.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              disabled={(environmentsQuery.data ?? []).length === 0}
              className="h-9 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
            >
              Create API Key
            </button>
          </div>

          {(environmentsQuery.data ?? []).length === 0 ? (
            <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You need at least one environment before creating an API key.
            </p>
          ) : null}

          {revealedApiKey ? (
            <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium uppercase text-emerald-700">
                Save this key now
              </p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-800">
                {revealedApiKey}
              </p>
            </section>
          ) : null}

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <h2 className="text-base font-semibold text-slate-900">Keys list</h2>

            {apiKeysQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading API keys...</p>
            ) : apiKeysQuery.error ? (
              <p className="mt-4 text-sm text-red-600">
                {(apiKeysQuery.error as Error).message}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3">Environment</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Prefix</th>
                      <th className="pb-3">Permission</th>
                      <th className="pb-3">Enabled</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {(apiKeysQuery.data ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <span className="font-medium text-slate-900">
                            {item.environmentName}
                          </span>
                        </td>
                        <td className="py-3">{item.name}</td>
                        <td className="py-3 font-mono text-xs">{item.keyPrefix}...</td>
                        <td className="py-3">
                          {item.canReadFeatureFlags ? "read:feature_flags" : "none"}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                data: { enabled: !item.enabled },
                              })
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              item.enabled
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: item.id,
                                  data: {
                                    canReadFeatureFlags: !item.canReadFeatureFlags,
                                  },
                                })
                              }
                              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
                            >
                              Toggle Permission
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Create API key</h2>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <select
                    value={environmentId}
                    onChange={(event) => setEnvironmentId(event.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  >
                    <option value="">Select environment</option>
                    {(environmentsQuery.data ?? []).map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name} ({environment.key})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Name"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={canReadFeatureFlags}
                      onChange={(event) => setCanReadFeatureFlags(event.target.checked)}
                    />
                    Read feature flags
                  </label>
                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => setEnabled(event.target.checked)}
                    />
                    Enabled
                  </label>
                </div>

                {createMutation.error ? (
                  <p className="mt-3 text-sm text-red-600">{createMutation.error.message}</p>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={
                      createMutation.isPending ||
                      !environmentId ||
                      (environmentsQuery.data ?? []).length === 0
                    }
                    className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
                  >
                    {createMutation.isPending ? "Creating..." : "Create API Key"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
