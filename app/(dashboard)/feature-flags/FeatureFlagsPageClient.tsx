"use client";

import { useMemo, useState } from "react";
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
  getPatchForInlineEdit,
  useCreateFeatureFlagMutation,
  useDeleteFeatureFlagMutation,
  useFeatureFlagsQuery,
  useUpdateFeatureFlagMutation,
} from "@/hooks/use-feature-flags";
import { useEnvironmentsQuery } from "@/hooks/use-environments";
import type { FeatureFlagItem } from "@/lib/feature-flags/schemas";

type FeatureFlagsPageClientProps = {
  userName: string;
  userEmail: string;
};

export function FeatureFlagsPageClient({
  userName,
  userEmail,
}: FeatureFlagsPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({
    environmentId: "",
    key: "",
    name: "",
    description: "",
    enabled: false,
    rolloutPercent: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({
    environmentId: "",
    key: "",
    name: "",
    description: "",
    rolloutPercent: 0,
  });

  const featureFlagsQuery = useFeatureFlagsQuery();
  const environmentsQuery = useEnvironmentsQuery();
  const createMutation = useCreateFeatureFlagMutation();
  const updateMutation = useUpdateFeatureFlagMutation();
  const deleteMutation = useDeleteFeatureFlagMutation();

  const loadingAny =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const flags = useMemo(() => featureFlagsQuery.data ?? [], [featureFlagsQuery.data]);
  const environments = useMemo(
    () => environmentsQuery.data ?? [],
    [environmentsQuery.data],
  );

  const summary = useMemo(() => {
    const enabled = flags.filter((item) => item.enabled).length;
    return {
      total: flags.length,
      enabled,
      disabled: flags.length - enabled,
    };
  }, [flags]);

  function startEdit(flag: FeatureFlagItem) {
    setEditingId(flag.id);
    setEditingForm({
      environmentId: flag.environmentId,
      key: flag.key,
      name: flag.name,
      description: flag.description ?? "",
      rolloutPercent: flag.rolloutPercent,
    });
  }

  async function handleCreate() {
    await createMutation.mutateAsync({
      ...newFlag,
      rolloutPercent: Number(newFlag.rolloutPercent),
    });
    setNewFlag({
      environmentId: "",
      key: "",
      name: "",
      description: "",
      enabled: false,
      rolloutPercent: 0,
    });
    setCreateModalOpen(false);
  }

  async function handleSaveEdit(flag: FeatureFlagItem) {
    const patch = getPatchForInlineEdit(flag, editingForm);
    if (Object.keys(patch).length === 0) {
      setEditingId(null);
      return;
    }

    await updateMutation.mutateAsync({
      id: flag.id,
      data: patch,
    });
    setEditingId(null);
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
                Feature Flags
              </H1>
              <Subtitle>
                Create, edit and control runtime flags.
              </Subtitle>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <Badge variant="neutral">Total: {summary.total}</Badge>
              <Badge variant="success">Enabled: {summary.enabled}</Badge>
              <Badge variant="neutral">Disabled: {summary.disabled}</Badge>
              <Button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                disabled={environments.length === 0}
                className="h-9 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
              >
                Create Flag
              </Button>
            </div>
          </div>

          {environments.length === 0 ? (
            <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You need at least one environment before creating a feature flag.
            </p>
          ) : null}

          <Card className="mt-5">
            <H2>Flags catalog</H2>

            {featureFlagsQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading flags...</p>
            ) : featureFlagsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(featureFlagsQuery.error as Error).message}
              </Alert>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[780px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">Environment</Th>
                      <Th className="pb-3">Key</Th>
                      <Th className="pb-3">Name</Th>
                      <Th className="pb-3">Rollout</Th>
                      <Th className="pb-3">State</Th>
                      <Th className="pb-3">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {flags.map((flag) => {
                      const isEditing = editingId === flag.id;
                      return (
                        <Tr key={flag.id} className="border-t border-slate-100">
                          <td className="py-3">
                            {isEditing ? (
                              <select
                                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm outline-none"
                                value={editingForm.environmentId}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    environmentId: event.target.value,
                                  }))
                                }
                              >
                                {environments.map((environment) => (
                                  <option key={environment.id} value={environment.id}>
                                    {environment.name} ({environment.key})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-medium text-slate-900">
                                {flag.environmentName}
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditing ? (
                              <input
                                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm outline-none"
                                value={editingForm.key}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    key: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <span className="font-medium text-slate-900">{flag.key}</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditing ? (
                              <input
                                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm outline-none"
                                value={editingForm.name}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    name: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <span>{flag.name}</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-sm outline-none"
                                value={editingForm.rolloutPercent}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({
                                    ...prev,
                                    rolloutPercent: Number(event.target.value),
                                  }))
                                }
                              />
                            ) : (
                              `${flag.rolloutPercent}%`
                            )}
                          </td>
                          <td className="py-3">
                            <Button
                              type="button"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: flag.id,
                                  data: { enabled: !flag.enabled },
                                })
                              }
                              disabled={loadingAny}
                              variant="ghost"
                              size="none"
                            >
                              <Badge variant={flag.enabled ? "success" : "neutral"} dot>
                                {flag.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </Button>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    type="button"
                                    onClick={() => handleSaveEdit(flag)}
                                    className="rounded-lg bg-[#465fff] px-3 py-1.5 text-xs font-medium text-white"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    onClick={() => startEdit(flag)}
                                    className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => deleteMutation.mutate(flag.id)}
                                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </div>
            )}
          </Card>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">Create flag</H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <select
                    value={newFlag.environmentId}
                    onChange={(event) =>
                      setNewFlag((prev) => ({
                        ...prev,
                        environmentId: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  >
                    <option value="">Select environment</option>
                    {environments.map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name} ({environment.key})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newFlag.key}
                    onChange={(event) =>
                      setNewFlag((prev) => ({ ...prev, key: event.target.value }))
                    }
                    placeholder="key (ex: checkout_v2)"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={newFlag.name}
                    onChange={(event) =>
                      setNewFlag((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Name"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={newFlag.description}
                    onChange={(event) =>
                      setNewFlag((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Description"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newFlag.rolloutPercent}
                    onChange={(event) =>
                      setNewFlag((prev) => ({
                        ...prev,
                        rolloutPercent: Number(event.target.value),
                      }))
                    }
                    placeholder="Rollout %"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={newFlag.enabled}
                      onChange={(event) =>
                        setNewFlag((prev) => ({
                          ...prev,
                          enabled: event.target.checked,
                        }))
                      }
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
                      environments.length === 0 ||
                      !newFlag.environmentId
                    }
                    className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
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
