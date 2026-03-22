"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { ApiKeyPermissionBadges } from "@/components/api-keys/ApiKeyPermissionBadges";
import {
  ApiKeyPermissionsFieldset,
  type ApiKeyPermissionsForm,
} from "@/components/api-keys/ApiKeyPermissionsFieldset";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectOption } from "@/components/ui/Select";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
import {
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useInfiniteApiKeysQuery,
  useUpdateApiKeyMutation,
} from "@/hooks/use-api-keys";
import { useEnvironmentsQuery } from "@/hooks/use-environments";

type ApiKeysPageClientProps = {
  userName: string;
  userEmail: string;
};

const defaultPermissions: ApiKeyPermissionsForm = {
  canReadFeatureFlags: true,
  canWriteFeatureFlags: false,
  canReadEnvironments: false,
  canWriteEnvironments: false,
  canReadProjects: false,
  canWriteProjects: false,
};

export function ApiKeysPageClient({ userName, userEmail }: ApiKeysPageClientProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("");

  const [createForm, setCreateForm] = useState({
    environmentId: "",
    name: "",
    enabled: "enabled",
  });
  const [createPermissions, setCreatePermissions] =
    useState<ApiKeyPermissionsForm>(defaultPermissions);

  const [editingApiKeyId, setEditingApiKeyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    environmentId: "",
    name: "",
    enabled: "enabled",
  });
  const [editPermissions, setEditPermissions] =
    useState<ApiKeyPermissionsForm>(defaultPermissions);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const apiKeysQuery = useInfiniteApiKeysQuery(debouncedSearch, environmentFilter);
  const environmentsQuery = useEnvironmentsQuery();
  const createMutation = useCreateApiKeyMutation();
  const updateMutation = useUpdateApiKeyMutation();
  const deleteMutation = useDeleteApiKeyMutation();

  const hasNextPage = apiKeysQuery.hasNextPage;
  const isFetchingNextPage = apiKeysQuery.isFetchingNextPage;
  const fetchNextPage = apiKeysQuery.fetchNextPage;

  const apiKeys = useMemo(
    () => apiKeysQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [apiKeysQuery.data],
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
    const created = await createMutation.mutateAsync({
      environmentId: createForm.environmentId,
      name: createForm.name,
      enabled: createForm.enabled === "enabled",
      ...createPermissions,
    });

    setCreateForm({
      environmentId: "",
      name: "",
      enabled: "enabled",
    });
    setCreatePermissions(defaultPermissions);
    setRevealedApiKey(created.apiKey);
    setCopied(false);
    setCreateModalOpen(false);
  }

  async function handleSaveEdit() {
    if (!editingApiKeyId) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingApiKeyId,
      data: {
        environmentId: editForm.environmentId,
        name: editForm.name,
        enabled: editForm.enabled === "enabled",
        ...editPermissions,
      },
    });

    setEditModalOpen(false);
    setEditingApiKeyId(null);
    setEditForm({
      environmentId: "",
      name: "",
      enabled: "enabled",
    });
    setEditPermissions(defaultPermissions);
  }

  async function handleCopyApiKey() {
    if (!revealedApiKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedApiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTargetId) {
      return;
    }

    await deleteMutation.mutateAsync(deleteTargetId);
    setConfirmDeleteOpen(false);
    setDeleteTargetId(null);
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
              <H1>{t("apiKeys.title")}</H1>
              <Subtitle>{t("apiKeys.subtitle")}</Subtitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              disabled={(environmentsQuery.data ?? []).length === 0}
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
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              {t("apiKeys.createButton")}
            </Button>
          </div>

          {(environmentsQuery.data ?? []).length === 0 ? (
            <Alert variant="warning" className="mb-5">
              {t("apiKeys.needEnvironment")}
            </Alert>
          ) : null}

          {revealedApiKey ? (
            <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium uppercase text-emerald-700">
                {t("apiKeys.revealTitle")}
              </p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-800">{revealedApiKey}</p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyApiKey}
                  leftIcon={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <rect
                        x="9"
                        y="9"
                        width="11"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M6 15H5C3.89543 15 3 14.1046 3 13V5C3 3.89543 3.89543 3 5 3H13C14.1046 3 15 3.89543 15 5V6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                >
                  {copied ? t("apiKeys.copied") : t("apiKeys.copyKey")}
                </Button>
              </div>
            </section>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <H2>{t("apiKeys.listTitle")}</H2>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[260px]">
                  <FormField
                    label={t("apiKeys.searchLabel")}
                    htmlFor="api-key-search"
                    className="mt-0"
                  >
                    <div className="relative">
                      <input
                        id="api-key-search"
                        type="text"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder={t("apiKeys.searchPlaceholder")}
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm outline-none focus:border-[#465fff]"
                      />
                      {searchInput ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSearchInput("")}
                          aria-label={t("apiKeys.clearSearch")}
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
                  </FormField>
                </div>

                <div className="w-[260px]">
                  <FormField
                    label={t("apiKeys.environmentFilterLabel")}
                    htmlFor="api-key-environment-filter"
                    className="mt-0"
                  >
                    <Select
                      id="api-key-environment-filter"
                      value={environmentFilter}
                      onChange={(event) => setEnvironmentFilter(event.target.value)}
                      searchable
                      searchPlaceholder="Search environments..."
                      options={[
                        { value: "", label: t("apiKeys.allEnvironments") },
                        ...((environmentsQuery.data ?? []).map((environment) => ({
                          value: environment.id,
                          label: `${environment.name} (${environment.key})`,
                        }))),
                      ]}
                    >
                      <SelectOption value="">{t("apiKeys.allEnvironments")}</SelectOption>
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>

            {apiKeysQuery.isLoading ? (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[860px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("apiKeys.tableEnvironment")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableName")}</Th>
                      <Th className="pb-3">{t("apiKeys.tablePrefix")}</Th>
                      <Th className="pb-3">{t("apiKeys.tablePermissions")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableEnabled")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Tr key={`api-keys-skeleton-${index}`} className="border-t border-slate-100">
                        <td className="py-3">
                          <Skeleton className="h-4 w-36" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-5 w-52" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ) : apiKeysQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(apiKeysQuery.error as Error).message}
              </Alert>
            ) : apiKeys.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("apiKeys.empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[860px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("apiKeys.tableEnvironment")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableName")}</Th>
                      <Th className="pb-3">{t("apiKeys.tablePrefix")}</Th>
                      <Th className="pb-3">{t("apiKeys.tablePermissions")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableEnabled")}</Th>
                      <Th className="pb-3">{t("apiKeys.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {apiKeys.map((item) => (
                      <Tr key={item.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <span className="font-medium text-slate-900">{item.environmentName}</span>
                        </td>
                        <td className="py-3">{item.name}</td>
                        <td className="py-3 font-mono text-xs">{item.keyPrefix}...</td>
                        <td className="py-3">
                          <ApiKeyPermissionBadges
                            canReadFeatureFlags={item.canReadFeatureFlags}
                            canWriteFeatureFlags={item.canWriteFeatureFlags}
                            canReadEnvironments={item.canReadEnvironments}
                            canWriteEnvironments={item.canWriteEnvironments}
                            canReadProjects={item.canReadProjects}
                            canWriteProjects={item.canWriteProjects}
                            t={t}
                          />
                        </td>
                        <td className="py-3">
                          <Badge variant={item.enabled ? "success" : "neutral"} dot>
                            {item.enabled ? t("apiKeys.stateEnabled") : t("apiKeys.stateDisabled")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setEditingApiKeyId(item.id);
                                setEditForm({
                                  environmentId: item.environmentId,
                                  name: item.name,
                                  enabled: item.enabled ? "enabled" : "disabled",
                                });
                                setEditPermissions({
                                  canReadFeatureFlags: item.canReadFeatureFlags,
                                  canWriteFeatureFlags: item.canWriteFeatureFlags,
                                  canReadEnvironments: item.canReadEnvironments,
                                  canWriteEnvironments: item.canWriteEnvironments,
                                  canReadProjects: item.canReadProjects,
                                  canWriteProjects: item.canWriteProjects,
                                });
                                setEditModalOpen(true);
                              }}
                              leftIcon={
                                <svg
                                  width="12"
                                  height="12"
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
                              {t("apiKeys.edit")}
                            </Button>

                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTargetId(item.id);
                                setConfirmDeleteOpen(true);
                              }}
                              leftIcon={
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden
                                >
                                  <path
                                    d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              }
                            >
                              {t("apiKeys.delete")}
                            </Button>
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                {isFetchingNextPage ? (
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
                  <H2 className="text-lg">{t("apiKeys.createModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("apiKeys.close")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FormField
                    label={t("apiKeys.environmentLabel")}
                    htmlFor="create-api-key-environment"
                    className="mt-0"
                  >
                    <Select
                      id="create-api-key-environment"
                      value={createForm.environmentId}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, environmentId: event.target.value }))
                      }
                      searchable
                      searchPlaceholder="Search environments..."
                      options={[
                        { value: "", label: t("apiKeys.environmentPlaceholder") },
                        ...((environmentsQuery.data ?? []).map((environment) => ({
                          value: environment.id,
                          label: `${environment.name} (${environment.key})`,
                        }))),
                      ]}
                    >
                      <SelectOption value="">{t("apiKeys.environmentPlaceholder")}</SelectOption>
                    </Select>
                  </FormField>

                  <FormField
                    label={t("apiKeys.nameLabel")}
                    htmlFor="create-api-key-name"
                    className="mt-0"
                  >
                    <input
                      id="create-api-key-name"
                      type="text"
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder={t("apiKeys.namePlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>

                  <FormField
                    label={t("apiKeys.enabledLabel")}
                    htmlFor="create-api-key-enabled"
                    className="mt-0"
                  >
                    <Select
                      id="create-api-key-enabled"
                      value={createForm.enabled}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, enabled: event.target.value }))
                      }
                    >
                      <SelectOption value="enabled">{t("apiKeys.optionEnabled")}</SelectOption>
                      <SelectOption value="disabled">{t("apiKeys.optionDisabled")}</SelectOption>
                    </Select>
                  </FormField>

                  <ApiKeyPermissionsFieldset
                    value={createPermissions}
                    onChange={setCreatePermissions}
                    t={t}
                  />
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
                    {t("apiKeys.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    loading={createMutation.isPending}
                    loadingLabel={t("apiKeys.creating")}
                    disabled={!createForm.environmentId}
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
                          d="M12 5V19M5 12H19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  >
                    {t("apiKeys.create")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("apiKeys.editModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingApiKeyId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("apiKeys.close")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <FormField
                    label={t("apiKeys.environmentLabel")}
                    htmlFor="edit-api-key-environment"
                    className="mt-0"
                  >
                    <Select
                      id="edit-api-key-environment"
                      value={editForm.environmentId}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, environmentId: event.target.value }))
                      }
                      searchable
                      searchPlaceholder="Search environments..."
                      options={[
                        { value: "", label: t("apiKeys.environmentPlaceholder") },
                        ...((environmentsQuery.data ?? []).map((environment) => ({
                          value: environment.id,
                          label: `${environment.name} (${environment.key})`,
                        }))),
                      ]}
                    >
                      <SelectOption value="">{t("apiKeys.environmentPlaceholder")}</SelectOption>
                    </Select>
                  </FormField>

                  <FormField
                    label={t("apiKeys.nameLabel")}
                    htmlFor="edit-api-key-name"
                    className="mt-0"
                  >
                    <input
                      id="edit-api-key-name"
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder={t("apiKeys.namePlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
                    />
                  </FormField>

                  <FormField
                    label={t("apiKeys.enabledLabel")}
                    htmlFor="edit-api-key-enabled"
                    className="mt-0"
                  >
                    <Select
                      id="edit-api-key-enabled"
                      value={editForm.enabled}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, enabled: event.target.value }))
                      }
                    >
                      <SelectOption value="enabled">{t("apiKeys.optionEnabled")}</SelectOption>
                      <SelectOption value="disabled">{t("apiKeys.optionDisabled")}</SelectOption>
                    </Select>
                  </FormField>

                  <ApiKeyPermissionsFieldset
                    value={editPermissions}
                    onChange={setEditPermissions}
                    t={t}
                  />
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
                      setEditingApiKeyId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("apiKeys.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveEdit}
                    loading={updateMutation.isPending}
                    loadingLabel={t("apiKeys.saving")}
                    disabled={!editingApiKeyId || !editForm.environmentId}
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
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                  >
                    {t("apiKeys.save")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <ConfirmDialog
            isOpen={confirmDeleteOpen}
            title={t("apiKeys.deleteConfirmTitle")}
            description={t("apiKeys.deleteConfirmDescription")}
            confirmLabel={t("apiKeys.delete")}
            cancelLabel={t("apiKeys.cancel")}
            isPending={deleteMutation.isPending}
            onCancel={() => {
              setConfirmDeleteOpen(false);
              setDeleteTargetId(null);
            }}
            onConfirm={() => {
              void handleDeleteConfirmed();
            }}
          />
        </main>
      </div>
    </div>
  );
}
