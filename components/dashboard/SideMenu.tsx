"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SideMenuProps = {
  isOpen: boolean;
};

export function SideMenu({ isOpen }: SideMenuProps) {
  const pathname = usePathname();

  const isDashboard = pathname === "/";
  const isFeatureFlags = pathname === "/feature-flags";
  const isApiKeys = pathname === "/api-keys";
  const isEnvironments = pathname === "/environments";

  const itemClass = (active: boolean) =>
    active
      ? "bg-[#465fff] text-white"
      : "text-slate-700 hover:bg-slate-100";

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-[290px] flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-transform duration-300 xl:static xl:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-7 pt-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#465fff] font-semibold text-white">
            T
          </span>
          <span className="text-lg font-semibold text-gray-800">FunWithFlags</span>
        </Link>
      </div>

      <nav className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        <div className="mb-6">
          <h3 className="mb-4 text-xs uppercase leading-[20px] text-gray-400">
            MENU
          </h3>
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/"
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${itemClass(isDashboard)}`}
              >
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
                <span className="truncate">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/feature-flags"
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${itemClass(isFeatureFlags)}`}
              >
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
                <span className="truncate">Feature Flags</span>
              </Link>
            </li>
            <li>
              <Link
                href="/api-keys"
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${itemClass(isApiKeys)}`}
              >
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
                <span className="truncate">API Keys</span>
              </Link>
            </li>
            <li>
              <Link
                href="/environments"
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${itemClass(isEnvironments)}`}
              >
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
                <span className="truncate">Environments</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
