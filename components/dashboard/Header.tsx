"use client";

type HeaderProps = {
  onToggleSidebar: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex w-full border-b border-gray-200 bg-white">
      <div className="flex w-full items-center justify-between gap-4 px-3 py-3 sm:px-5 lg:px-6 lg:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 xl:h-11 xl:w-11"
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

          <div className="relative hidden xl:block">
            <input
              type="text"
              placeholder="Search or type command..."
              className="h-11 w-[430px] rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 placeholder:text-gray-400 outline-none ring-[#465fff]/10 focus:border-[#465fff] focus:ring-4"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04 9.37a6.33 6.33 0 1 1 12.67 0 6.33 6.33 0 0 1-12.67 0ZM9.37 1.54a7.83 7.83 0 1 0 4.98 13.86l2.83 2.83a.75.75 0 1 0 1.06-1.06l-2.82-2.82a7.83 7.83 0 0 0-6.05-12.8Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500">
              ⌘ K
            </span>
          </div>
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

          <button
            type="button"
            className="flex items-center gap-3 rounded-full border border-gray-200 bg-white p-1 pr-3 transition hover:bg-gray-100"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              MC
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-gray-800">
                Musharof
              </span>
              <span className="block text-xs text-gray-500">
                [email protected]
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
