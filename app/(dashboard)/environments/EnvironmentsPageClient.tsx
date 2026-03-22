"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
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
  const [newEnvironment, setNewEnvironment] = useState({
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
                Environments
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage deployment targets like dev, staging and production.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9]"
            >
              Create Environment
            </button>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
            <h2 className="text-base font-semibold text-slate-900">Environments list</h2>

            {environmentsQuery.isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading environments...</p>
            ) : environmentsQuery.error ? (
              <p className="mt-4 text-sm text-red-600">
                {(environmentsQuery.error as Error).message}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3">Key</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">State</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {(environmentsQuery.data ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{item.key}</td>
                        <td className="py-3">{item.name}</td>
                        <td className="py-3">{item.description ?? "-"}</td>
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
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700"
                          >
                            Delete
                          </button>
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
                  <h2 className="text-lg font-semibold text-slate-900">
                    Create environment
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Close
                  </button>
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
                    disabled={createMutation.isPending}
                    className="h-10 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white hover:bg-[#364ed9] disabled:opacity-70"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
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
