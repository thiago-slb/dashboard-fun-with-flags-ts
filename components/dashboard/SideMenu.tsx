"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { useNavigationMenuQuery } from "@/hooks/use-navigation-menu";
import { useProjectsQuery, useSetActiveProjectMutation } from "@/hooks/use-projects";
import type { NavigationMenuItem } from "@/lib/navigation/schemas";

type SideMenuProps = {
  isOpen: boolean;
};

export function SideMenu({ isOpen }: SideMenuProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const menuQuery = useNavigationMenuQuery();
  const menuItems = menuQuery.data ?? [];
  const isMenuLoading = menuQuery.isLoading;
  const canSelectProject = menuItems.some((item) => item.id === "projects");
  const projectsQuery = useProjectsQuery(canSelectProject);
  const setActiveProjectMutation = useSetActiveProjectMutation();

  const itemClass = (active: boolean) =>
    active
      ? "bg-[#465fff] text-white"
      : "text-slate-700 hover:bg-slate-100";

  function isItemActive(item: NavigationMenuItem) {
    if (item.href === "/") {
      return pathname === "/";
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function renderMenuIcon(icon: NavigationMenuItem["icon"]) {
    if (icon === "dashboard") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V9C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 9V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM15 3.25C13.7574 3.25 12.75 4.25736 12.75 5.5V9C12.75 10.2426 13.7574 11.25 15 11.25H18.5C19.7426 11.25 20.75 10.2426 20.75 9V5.5C20.75 4.25736 19.7426 3.25 18.5 3.25H15ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7426 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7426 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15Z"
            fill="currentColor"
          />
        </svg>
      );
    }

    if (icon === "feature_flags") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M6 4V20M6 8H15.5L13.5 12L15.5 16H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (icon === "api_keys") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M14 8.5A4.5 4.5 0 1 0 5 8.5A4.5 4.5 0 0 0 14 8.5ZM14 8.5H22M19 8.5V11.5M17 8.5V10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (icon === "environments") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 9.5L12 11.5L15.5 9.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (icon === "experiments") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M6 4V20M18 4V20M6 8H18M6 16H18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="12" r="1.5" fill="currentColor" />
          <circle cx="14" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    }

    if (icon === "analytics") {
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M4 19V5M20 19H4M8 16V11M12 16V8M16 16V13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M4 6.5C4 5.67157 4.67157 5 5.5 5H10.5C11.3284 5 12 5.67157 12 6.5V11.5C12 12.3284 11.3284 13 10.5 13H5.5C4.67157 13 4 12.3284 4 11.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 6.5C12 5.67157 12.6716 5 13.5 5H18.5C19.3284 5 20 5.67157 20 6.5V11.5C20 12.3284 19.3284 13 18.5 13H13.5C12.6716 13 12 12.3284 12 11.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4 13.5C4 12.6716 4.67157 12 5.5 12H10.5C11.3284 12 12 12.6716 12 13.5V18.5C12 19.3284 11.3284 20 10.5 20H5.5C4.67157 20 4 19.3284 4 18.5V13.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-[290px] flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-transform duration-300 xl:static xl:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-7 pt-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-800">FunWithFlags</span>
        </Link>
      </div>

      {canSelectProject ? (
        <div className="mb-6">
        <label className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M4 6.5C4 5.67157 4.67157 5 5.5 5H10.5C11.3284 5 12 5.67157 12 6.5V11.5C12 12.3284 11.3284 13 10.5 13H5.5C4.67157 13 4 12.3284 4 11.5V6.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 6.5C12 5.67157 12.6716 5 13.5 5H18.5C19.3284 5 20 5.67157 20 6.5V11.5C20 12.3284 19.3284 13 18.5 13H13.5C12.6716 13 12 12.3284 12 11.5V6.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M4 13.5C4 12.6716 4.67157 12 5.5 12H10.5C11.3284 12 12 12.6716 12 13.5V18.5C12 19.3284 11.3284 20 10.5 20H5.5C4.67157 20 4 19.3284 4 18.5V13.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          {t("sideMenu.projectActive")}
        </label>
        {projectsQuery.isLoading ? (
          <Skeleton className="h-10 w-full rounded-lg" />
        ) : (
          <Select
            value={(projectsQuery.data ?? []).find((item) => item.isActive)?.id ?? ""}
            onChange={async (event) => {
              const projectId = event.target.value;
              if (!projectId) {
                return;
              }
              await setActiveProjectMutation.mutateAsync({ projectId });
              window.location.reload();
            }}
            disabled={setActiveProjectMutation.isPending}
            options={[
              { value: "", label: t("sideMenu.selectProject") },
              ...((projectsQuery.data ?? []).map((project) => ({
                value: project.id,
                label: project.name,
              }))),
            ]}
          />
        )}
        </div>
      ) : null}

      <nav className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        <div className="mb-6">
          <h3 className="mb-4 text-xs uppercase leading-[20px] text-gray-400">
            {t("sideMenu.menu")}
          </h3>
          <ul className="flex flex-col gap-1">
            {isMenuLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <li key={`menu-skeleton-${index}`} className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </li>
                ))
              : menuItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${itemClass(isItemActive(item))}`}
                    >
                      {renderMenuIcon(item.icon)}
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
