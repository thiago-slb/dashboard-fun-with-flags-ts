"use client";

import Link from "next/link";

type HeaderProps = {
  onToggleSidebar: () => void;
  userName: string;
  userEmail: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function Header({ onToggleSidebar, userName, userEmail }: HeaderProps) {
  const initials = getInitials(userName);

  return (
    <header className="sticky top-0 z-40 flex w-full border-b border-gray-200 bg-white">
      <div className="flex w-full items-center justify-between gap-4 px-3 py-3 sm:px-5 lg:px-6 lg:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 xl:hidden"
            aria-label="Toggle sidebar"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 5.25h16v1.5H2zm0 4h8v1.5H2zm0 4h16v1.5H2z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Notifications"
          >
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-orange-400">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            </span>
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 1.54a.75.75 0 0 0-.75.75v.55a6.38 6.38 0 0 0-5.62 6.33v5.29h-.29a.75.75 0 1 0 0 1.5h13.33a.75.75 0 1 0 0-1.5h-.29V9.17a6.38 6.38 0 0 0-5.63-6.33v-.55A.75.75 0 0 0 10 1.54Zm-1.25 15.42a.75.75 0 0 0 0 1.5h2.5a.75.75 0 1 0 0-1.5h-2.5Z" />
            </svg>
          </button>

          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-full border border-gray-200 bg-white p-1 pr-3 transition hover:bg-gray-100"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-gray-800">
                {userName}
              </span>
              <span className="block text-xs text-gray-500">
                {userEmail}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
