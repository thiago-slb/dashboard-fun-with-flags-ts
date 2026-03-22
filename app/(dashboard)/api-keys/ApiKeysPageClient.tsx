"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
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
        <Button
          type="button"
          variant="unstyled"
          size="none"
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
              <H1>
                API Keys
              </H1>
              <Subtitle>
                Manage machine-to-machine access for reading feature flags.
              </Subtitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              disabled={(environmentsQuery.data ?? []).length === 0}
              className="h-9 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
            >
              Create API Key
            </Button>
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

          <Card className="mt-5">
            <H2>Keys list</H2>

            {apiKeysQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading API keys...</p>
            ) : apiKeysQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(apiKeysQuery.error as Error).message}
              </Alert>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">Environment</Th>
                      <Th className="pb-3">Name</Th>
                      <Th className="pb-3">Prefix</Th>
                      <Th className="pb-3">Permission</Th>
                      <Th className="pb-3">Enabled</Th>
                      <Th className="pb-3">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {(apiKeysQuery.data ?? []).map((item) => (
                      <Tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <span className="font-medium text-slate-900">
                            {item.environmentName}
                          </span>
                        </td>
                        <td className="py-3">{item.name}</td>
                        <td className="py-3 font-mono text-xs">{item.keyPrefix}...</td>
                        <td className="py-3">
                          {item.canReadFeatureFlags ? (
                            <Badge variant="info">read:feature_flags</Badge>
                          ) : (
                            <Badge variant="neutral">none</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <Button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                data: { enabled: !item.enabled },
                              })
                            }
                            variant="ghost"
                            size="none"
                          >
                            <Badge variant={item.enabled ? "success" : "neutral"} dot>
                              {item.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </Button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Button
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
                            </Button>
                            <Button
                              type="button"
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            )}
          </Card>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">Create API key</H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </Button>
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
                  <Alert variant="error" className="mt-3">
                    {createMutation.error.message}
                  </Alert>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
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
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
