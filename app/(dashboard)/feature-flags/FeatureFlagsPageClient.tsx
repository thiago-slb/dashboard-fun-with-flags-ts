"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FeatureFlagFormFields, type FeatureFlagFormValue } from "@/components/feature-flags/FeatureFlagFormFields";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Skeleton } from "@/components/ui/Skeleton";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
import {
  useCreateFeatureFlagMutation,
  useDeleteFeatureFlagMutation,
  useInfiniteFeatureFlagsQuery,
  useUpdateFeatureFlagMutation,
} from "@/hooks/use-feature-flags";
import { useEnvironmentsQuery } from "@/hooks/use-environments";
import type { FeatureFlagItem } from "@/lib/feature-flags/schemas";
import { useI18n } from "@/components/i18n/I18nProvider";

type FeatureFlagsPageClientProps = {
  userName: string;
  userEmail: string;
};

const defaultForm: FeatureFlagFormValue = {
  environmentId: "",
  key: "",
  name: "",
  description: "",
  rolloutPercent: 0,
  enabled: "disabled",
  allowListEmails: [],
};

export function FeatureFlagsPageClient({ userName, userEmail }: FeatureFlagsPageClientProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FeatureFlagFormValue>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FeatureFlagFormValue>(defaultForm);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const featureFlagsQuery = useInfiniteFeatureFlagsQuery(debouncedSearch);
  const environmentsQuery = useEnvironmentsQuery();
  const createMutation = useCreateFeatureFlagMutation();
  const updateMutation = useUpdateFeatureFlagMutation();
  const deleteMutation = useDeleteFeatureFlagMutation();

  const environments = useMemo(() => environmentsQuery.data ?? [], [environmentsQuery.data]);
  const flags = useMemo(
    () => featureFlagsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [featureFlagsQuery.data],
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

    const hasNextPage = featureFlagsQuery.hasNextPage;
    const isFetchingNextPage = featureFlagsQuery.isFetchingNextPage;
    const fetchNextPage = featureFlagsQuery.fetchNextPage;

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
  }, [featureFlagsQuery.fetchNextPage, featureFlagsQuery.hasNextPage, featureFlagsQuery.isFetchingNextPage]);

  const summary = useMemo(() => {
    const enabled = flags.filter((item) => item.enabled).length;
    return {
      total: flags.length,
      enabled,
      disabled: flags.length - enabled,
    };
  }, [flags]);

  function openEditModal(flag: FeatureFlagItem) {
    setEditingId(flag.id);
    setEditForm({
      environmentId: flag.environmentId,
      key: flag.key,
      name: flag.name,
      description: flag.description ?? "",
      rolloutPercent: flag.rolloutPercent,
      enabled: flag.enabled ? "enabled" : "disabled",
      allowListEmails: flag.allowListEmails,
    });
    setEditModalOpen(true);
  }

  async function handleCreate() {
    await createMutation.mutateAsync({
      environmentId: createForm.environmentId,
      key: createForm.key,
      name: createForm.name,
      description: createForm.description,
      rolloutPercent: createForm.rolloutPercent,
      enabled: createForm.enabled === "enabled",
      allowListEmails: createForm.allowListEmails,
    });
    setCreateForm(defaultForm);
    setCreateModalOpen(false);
  }

  async function handleSaveEdit() {
    if (!editingId) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingId,
      data: {
        environmentId: editForm.environmentId,
        key: editForm.key,
        name: editForm.name,
        description: editForm.description.trim().length > 0 ? editForm.description : null,
        rolloutPercent: editForm.rolloutPercent,
        enabled: editForm.enabled === "enabled",
        allowListEmails: editForm.allowListEmails,
      },
    });

    setEditModalOpen(false);
    setEditingId(null);
    setEditForm(defaultForm);
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
              <H1>{t("featureFlags.title")}</H1>
              <Subtitle>{t("featureFlags.subtitle")}</Subtitle>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <Badge variant="neutral">{t("featureFlags.total")}: {summary.total}</Badge>
              <Badge variant="success">{t("featureFlags.enabled")}: {summary.enabled}</Badge>
              <Badge variant="neutral">{t("featureFlags.disabled")}: {summary.disabled}</Badge>
              <Button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                disabled={environments.length === 0}
                leftIcon={(
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              >
                {t("featureFlags.createButton")}
              </Button>
            </div>
          </div>

          {environments.length === 0 ? (
            <Alert variant="warning" className="mb-5">
              {t("featureFlags.needEnvironment")}
            </Alert>
          ) : null}

          <Card className="mt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <H2>{t("featureFlags.listTitle")}</H2>
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("featureFlags.searchPlaceholder")}
                  aria-label={t("featureFlags.searchAria")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm outline-none focus:border-[#465fff]"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchInput("")}
                    aria-label={t("featureFlags.clearSearch")}
                    className="absolute right-1 top-1 h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>

            {featureFlagsQuery.isLoading ? (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[860px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("featureFlags.tableEnvironment")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableKey")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableName")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableRollout")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableState")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Tr key={`feature-flags-skeleton-${index}`} className="border-t border-slate-100">
                        <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
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
            ) : featureFlagsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(featureFlagsQuery.error as Error).message}
              </Alert>
            ) : flags.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("featureFlags.empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[860px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("featureFlags.tableEnvironment")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableKey")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableName")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableRollout")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableState")}</Th>
                      <Th className="pb-3">{t("featureFlags.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {flags.map((flag) => (
                      <Tr key={flag.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <span className="font-medium text-slate-900">{flag.environmentName}</span>
                        </td>
                        <td className="py-3 font-medium text-slate-900">{flag.key}</td>
                        <td className="py-3">{flag.name}</td>
                        <td className="py-3">{flag.rolloutPercent}%</td>
                        <td className="py-3">
                          <Button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: flag.id, data: { enabled: !flag.enabled } })}
                            variant="ghost"
                            size="none"
                          >
                            <Badge variant={flag.enabled ? "success" : "neutral"} dot>
                              {flag.enabled ? t("featureFlags.stateEnabled") : t("featureFlags.stateDisabled")}
                            </Badge>
                          </Button>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => openEditModal(flag)}
                              leftIcon={(
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M12 20H21M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            >
                              {t("featureFlags.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTargetId(flag.id);
                                setConfirmDeleteOpen(true);
                              }}
                              leftIcon={(
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            >
                              {t("featureFlags.delete")}
                            </Button>
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                {featureFlagsQuery.isFetchingNextPage ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <span className="text-xs text-slate-500">{t("featureFlags.loadingMore")}</span>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("featureFlags.createModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("featureFlags.close")}
                  </Button>
                </div>

                <FeatureFlagFormFields
                  value={createForm}
                  onChange={setCreateForm}
                  environments={environments}
                  prefix="create"
                />

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
                    {t("featureFlags.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    loading={createMutation.isPending}
                    loadingLabel={t("featureFlags.creating")}
                    disabled={environments.length === 0 || !createForm.environmentId}
                    leftIcon={(
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  >
                    {t("featureFlags.create")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("featureFlags.editModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("featureFlags.close")}
                  </Button>
                </div>

                <FeatureFlagFormFields
                  value={editForm}
                  onChange={setEditForm}
                  environments={environments}
                  prefix="edit"
                  disabled={!editingId}
                />

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
                      setEditingId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("featureFlags.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveEdit}
                    loading={updateMutation.isPending}
                    loadingLabel={t("featureFlags.saving")}
                    disabled={!editingId || !editForm.environmentId}
                    leftIcon={(
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  >
                    {t("featureFlags.save")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <ConfirmDialog
            isOpen={confirmDeleteOpen}
            title={t("featureFlags.deleteConfirmTitle")}
            description={t("featureFlags.deleteConfirmDescription")}
            confirmLabel={t("featureFlags.delete")}
            cancelLabel={t("featureFlags.cancel")}
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
