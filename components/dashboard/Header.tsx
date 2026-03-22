"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/Button";

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
          <Button
            onClick={onToggleSidebar}
            variant="outline"
            size="icon"
            className="text-gray-500 xl:hidden"
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
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />

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
