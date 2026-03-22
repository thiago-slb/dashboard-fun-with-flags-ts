"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Skeleton } from "@/components/ui/Skeleton";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
import {
  useCreateProjectMutation,
  useInfiniteProjectsQuery,
  useSetActiveProjectMutation,
  useUpdateProjectMutation,
} from "@/hooks/use-projects";

type ProjectsPageClientProps = {
  userName: string;
  userEmail: string;
};

export function ProjectsPageClient({ userName, userEmail }: ProjectsPageClientProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const router = useRouter();

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const projectsQuery = useInfiniteProjectsQuery(debouncedSearch);
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const setActiveMutation = useSetActiveProjectMutation();
  const hasNextPage = projectsQuery.hasNextPage;
  const isFetchingNextPage = projectsQuery.isFetchingNextPage;
  const fetchNextPage = projectsQuery.fetchNextPage;
  const projects = useMemo(
    () => projectsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [projectsQuery.data],
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
      name: projectName,
    });
    setProjectName("");
    setCreateModalOpen(false);
    await setActiveMutation.mutateAsync({ projectId: created.id });
    router.refresh();
  }

  async function handleSwitch(projectId: string) {
    await setActiveMutation.mutateAsync({ projectId });
    window.location.reload();
  }

  async function handleUpdateProject() {
    if (!editingProjectId) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingProjectId,
      data: { name: editingProjectName },
    });
    setEditModalOpen(false);
    setEditingProjectId(null);
    setEditingProjectName("");
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
              <H1>{t("projects.title")}</H1>
              <Subtitle>{t("projects.subtitle")}</Subtitle>
            </div>
            <Button
              type="button"
              onClick={() => setCreateModalOpen(true)}
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
              {t("projects.createButton")}
            </Button>
          </div>

          <Card>
            <H2>{t("projects.listTitle")}</H2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("projects.searchPlaceholder")}
                  aria-label={t("projects.searchAria")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-800 outline-none focus:border-[#465fff]"
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

            {projectsQuery.isLoading ? (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("projects.tableName")}</Th>
                      <Th className="pb-3">{t("projects.tableSlug")}</Th>
                      <Th className="pb-3">{t("projects.tableStatus")}</Th>
                      <Th className="pb-3">{t("projects.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Tr key={`projects-skeleton-${index}`} className="border-t border-slate-100">
                        <td className="py-3">
                          <Skeleton className="h-4 w-40" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="py-3">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-14 rounded-lg" />
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ) : projectsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(projectsQuery.error as Error).message}
              </Alert>
            ) : projects.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("projects.empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[760px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("projects.tableName")}</Th>
                      <Th className="pb-3">{t("projects.tableSlug")}</Th>
                      <Th className="pb-3">{t("projects.tableStatus")}</Th>
                      <Th className="pb-3">{t("projects.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {projects.map((item) => {
                      return (
                        <Tr key={item.id} className="border-t border-slate-100">
                          <td className="py-3">
                            <span className="font-medium text-slate-900">{item.name}</span>
                          </td>
                          <td className="py-3 font-mono text-xs text-slate-600">
                            {item.slug}
                          </td>
                          <td className="py-3">
                            {item.isActive ? (
                              <Badge variant="success" dot>
                                {t("projects.statusActive")}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" dot>
                                {t("projects.statusInactive")}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {!item.isActive ? (
                                <Button
                                  type="button"
                                  onClick={() => handleSwitch(item.id)}
                                  variant="secondary"
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
                                        d="M4 7H18M18 7L14 3M18 7L14 11M20 17H6M6 17L10 13M6 17L10 21"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  }
                                >
                                  {t("projects.switch")}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                onClick={() => {
                                  setEditingProjectId(item.id);
                                  setEditingProjectName(item.name);
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
                                {t("projects.edit")}
                              </Button>
                            </div>
                          </td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                {projectsQuery.isFetchingNextPage ? (
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
              <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("projects.createModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("projects.close")}
                  </Button>
                </div>

                <div className="mt-4">
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    {t("projects.nameLabel")}
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder={t("projects.namePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
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
                    {t("projects.cancel")}
                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleCreate}
                                    loading={createMutation.isPending}
                                    loadingLabel={t("projects.creating")}
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
                                    {t("projects.create")}
                                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("projects.editModalTitle")}</H2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingProjectId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("projects.close")}
                  </Button>
                </div>

                <div className="mt-4">
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    {t("projects.nameLabel")}
                  </label>
                  <input
                    type="text"
                    value={editingProjectName}
                    onChange={(event) => setEditingProjectName(event.target.value)}
                    placeholder={t("projects.namePlaceholder")}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
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
                      setEditingProjectId(null);
                    }}
                    variant="secondary"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                  >
                    {t("projects.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdateProject}
                    loading={updateMutation.isPending}
                    loadingLabel={t("projects.saving")}
                  >
                    {t("projects.save")}
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
