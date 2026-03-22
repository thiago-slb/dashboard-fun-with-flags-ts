"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Skeleton } from "@/components/ui/Skeleton";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
import {
  useCreateEnvironmentMutation,
  useInfiniteEnvironmentsQuery,
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
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
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

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const environmentsQuery = useInfiniteEnvironmentsQuery(debouncedSearch);
  const createMutation = useCreateEnvironmentMutation();
  const updateMutation = useUpdateEnvironmentMutation();
  const hasNextPage = environmentsQuery.hasNextPage;
  const isFetchingNextPage = environmentsQuery.isFetchingNextPage;
  const fetchNextPage = environmentsQuery.fetchNextPage;
  const environments = useMemo(
    () => environmentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [environmentsQuery.data],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
                {t("environments.title")}
              </H1>
              <Subtitle>
                {t("environments.subtitle")}
              </Subtitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              leftIcon={
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
              }
            >
              {t("environments.createButton")}
            </Button>
          </div>

          <Card className="mt-5">
            <H2>{t("environments.listTitle")}</H2>

            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("projects.searchPlaceholder")}
                  aria-label={t("projects.searchAria")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm outline-none focus:border-[#465fff]"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchInput("")}
                    aria-label={t("projects.clearSearch")}
                    className="absolute right-1 top-1 h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
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
                        d="M18 6L6 18M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>

            {environmentsQuery.isLoading ? (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("environments.tableKey")}</Th>
                      <Th className="pb-3">{t("environments.tableName")}</Th>
                      <Th className="pb-3">{t("environments.tableDescription")}</Th>
                      <Th className="pb-3">{t("environments.tableState")}</Th>
                      <Th className="pb-3">{t("environments.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Tr key={`environments-skeleton-${index}`} className="border-t border-slate-100">
                        <td className="py-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-4 w-36" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-4 w-56" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-5 w-24 rounded-full" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ) : environmentsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(environmentsQuery.error as Error).message}
              </Alert>
            ) : environments.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("projects.empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("environments.tableKey")}</Th>
                      <Th className="pb-3">{t("environments.tableName")}</Th>
                      <Th className="pb-3">{t("environments.tableDescription")}</Th>
                      <Th className="pb-3">{t("environments.tableState")}</Th>
                      <Th className="pb-3">{t("environments.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {environments.map((item) => (
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
                              {item.enabled
                                ? t("environments.stateEnabled")
                                : t("environments.stateDisabled")}
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
                              variant="primary"
                              size="sm"
                              leftIcon={
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
                              }
                            >
                              {t("environments.edit")}
                            </Button>
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                {environmentsQuery.isFetchingNextPage ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">
                    {t("environments.createModalTitle")}
                  </H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("environments.close")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FormField
                    label={t("environments.keyLabel")}
                    htmlFor="create-environment-key"
                    className="mt-0"
                  >
                    <input
                      id="create-environment-key"
                      type="text"
                      value={newEnvironment.key}
                      onChange={(event) =>
                        setNewEnvironment((prev) => ({ ...prev, key: event.target.value }))
                      }
                      placeholder={t("environments.keyPlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField
                    label={t("environments.nameLabel")}
                    htmlFor="create-environment-name"
                    className="mt-0"
                  >
                    <input
                      id="create-environment-name"
                      type="text"
                      value={newEnvironment.name}
                      onChange={(event) =>
                        setNewEnvironment((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder={t("environments.namePlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField
                    label={t("environments.descriptionLabel")}
                    htmlFor="create-environment-description"
                    className="mt-0"
                  >
                    <input
                      id="create-environment-description"
                      type="text"
                      value={newEnvironment.description}
                      onChange={(event) =>
                        setNewEnvironment((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t("environments.descriptionPlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField label={t("environments.enabledLabel")} className="mt-0">
                    <select
                      value={newEnvironment.enabled ? "enabled" : "disabled"}
                      onChange={(event) =>
                        setNewEnvironment((prev) => ({
                          ...prev,
                          enabled: event.target.value === "enabled",
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    >
                      <option value="enabled">{t("environments.optionEnabled")}</option>
                      <option value="disabled">{t("environments.optionDisabled")}</option>
                    </select>
                  </FormField>
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
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("environments.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    loading={createMutation.isPending}
                    loadingLabel={t("environments.creating")}
                    leftIcon={
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
                    }
                  >
                    {t("environments.create")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("environments.editModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingEnvironmentId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("environments.close")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FormField
                    label={t("environments.keyLabel")}
                    htmlFor="edit-environment-key"
                    className="mt-0"
                  >
                    <input
                      id="edit-environment-key"
                      type="text"
                      value={editingEnvironment.key}
                      onChange={(event) =>
                        setEditingEnvironment((prev) => ({ ...prev, key: event.target.value }))
                      }
                      placeholder={t("environments.keyPlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField
                    label={t("environments.nameLabel")}
                    htmlFor="edit-environment-name"
                    className="mt-0"
                  >
                    <input
                      id="edit-environment-name"
                      type="text"
                      value={editingEnvironment.name}
                      onChange={(event) =>
                        setEditingEnvironment((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder={t("environments.namePlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField
                    label={t("environments.descriptionLabel")}
                    htmlFor="edit-environment-description"
                    className="mt-0"
                  >
                    <input
                      id="edit-environment-description"
                      type="text"
                      value={editingEnvironment.description}
                      onChange={(event) =>
                        setEditingEnvironment((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t("environments.descriptionPlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>
                  <FormField label={t("environments.enabledLabel")} className="mt-0">
                    <select
                      value={editingEnvironment.enabled ? "enabled" : "disabled"}
                      onChange={(event) =>
                        setEditingEnvironment((prev) => ({
                          ...prev,
                          enabled: event.target.value === "enabled",
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    >
                      <option value="enabled">{t("environments.optionEnabled")}</option>
                      <option value="disabled">{t("environments.optionDisabled")}</option>
                    </select>
                  </FormField>
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
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("environments.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    loading={updateMutation.isPending}
                    loadingLabel={t("environments.saving")}
                    disabled={!editingEnvironmentId}
                    leftIcon={
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
                    }
                  >
                    {t("environments.save")}
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
