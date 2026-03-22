"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  useCreateEnvironmentMutation,
  useDeleteEnvironmentMutation,
  useEnvironmentsQuery,
  useUpdateEnvironmentMutation,
} from "@/hooks/use-environments";

type EnvironmentsPageClientProps = {
  userName: string;
  userEmail: string;
};

export function EnvironmentsPageClient({
  userName,
  userEmail,
}: EnvironmentsPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newEnvironment, setNewEnvironment] = useState({
    key: "",
    name: "",
    description: "",
    enabled: true,
  });
  const [editingEnvironment, setEditingEnvironment] = useState({
    key: "",
    name: "",
    description: "",
    enabled: true,
  });

  const environmentsQuery = useEnvironmentsQuery();
  const createMutation = useCreateEnvironmentMutation();
  const updateMutation = useUpdateEnvironmentMutation();
  const deleteMutation = useDeleteEnvironmentMutation();

  async function handleCreate() {
    await createMutation.mutateAsync(newEnvironment);
    setNewEnvironment({
      key: "",
      name: "",
      description: "",
      enabled: true,
    });
    setCreateModalOpen(false);
  }

  async function handleUpdate() {
    if (!editingEnvironmentId) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingEnvironmentId,
      data: editingEnvironment,
    });
    setEditModalOpen(false);
    setEditingEnvironmentId(null);
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
                Environments
              </H1>
              <Subtitle>
                Manage deployment targets like dev, staging and production.
              </Subtitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create Environment
            </Button>
          </div>

          <Card className="mt-5">
            <H2>Environments list</H2>

            {environmentsQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading environments...</p>
            ) : environmentsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(environmentsQuery.error as Error).message}
              </Alert>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">Key</Th>
                      <Th className="pb-3">Name</Th>
                      <Th className="pb-3">Description</Th>
                      <Th className="pb-3">State</Th>
                      <Th className="pb-3">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {(environmentsQuery.data ?? []).map((item) => (
                      <Tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{item.key}</td>
                        <td className="py-3">{item.name}</td>
                        <td className="py-3">{item.description ?? "-"}</td>
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
                              onClick={() => {
                                setEditingEnvironmentId(item.id);
                                setEditingEnvironment({
                                  key: item.key,
                                  name: item.name,
                                  description: item.description ?? "",
                                  enabled: item.enabled,
                                });
                                setEditModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden
                              >
                                <path
                                  d="M12 20H21M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  id: item.id,
                                  name: item.name,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden
                              >
                                <path
                                  d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6M10 11V17M14 11V17"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
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
                  <H2 className="text-lg">
                    Create environment
                  </H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={newEnvironment.key}
                    onChange={(event) =>
                      setNewEnvironment((prev) => ({ ...prev, key: event.target.value }))
                    }
                    placeholder="key (ex: production)"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={newEnvironment.name}
                    onChange={(event) =>
                      setNewEnvironment((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Name"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={newEnvironment.description}
                    onChange={(event) =>
                      setNewEnvironment((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Description"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={newEnvironment.enabled}
                      onChange={(event) =>
                        setNewEnvironment((prev) => ({
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
                    disabled={createMutation.isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M12 5V19M5 12H19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">Edit environment</H2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingEnvironmentId(null);
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={editingEnvironment.key}
                    onChange={(event) =>
                      setEditingEnvironment((prev) => ({ ...prev, key: event.target.value }))
                    }
                    placeholder="key (ex: production)"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={editingEnvironment.name}
                    onChange={(event) =>
                      setEditingEnvironment((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Name"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="text"
                    value={editingEnvironment.description}
                    onChange={(event) =>
                      setEditingEnvironment((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Description"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                  />
                  <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingEnvironment.enabled}
                      onChange={(event) =>
                        setEditingEnvironment((prev) => ({
                          ...prev,
                          enabled: event.target.checked,
                        }))
                      }
                    />
                    Enabled
                  </label>
                </div>

                {updateMutation.error ? (
                  <Alert variant="error" className="mt-3">
                    {updateMutation.error.message}
                  </Alert>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingEnvironmentId(null);
                    }}
                    className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending || !editingEnvironmentId}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M20 6L9 17L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <ConfirmDialog
            isOpen={Boolean(deleteTarget)}
            title="Delete environment"
            description={`Do you really want to delete "${deleteTarget?.name ?? ""}"? This action cannot be undone.`}
            confirmLabel="Yes, delete"
            isPending={deleteMutation.isPending}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={async () => {
              if (!deleteTarget) {
                return;
              }
              await deleteMutation.mutateAsync(deleteTarget.id);
              setDeleteTarget(null);
            }}
          />
        </main>
      </div>
    </div>
  );
}
