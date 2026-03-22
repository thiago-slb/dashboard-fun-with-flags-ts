"use client";

import Link from "next/link";

type SideMenuProps = {
  isOpen: boolean;
};

const menuSections = [
  {
    title: "MENU",
    items: [
      "Dashboard",
      "AI Assistant",
      "E-commerce",
      "Calendar",
      "User Profile",
      "Task",
      "Forms",
      "Tables",
      "Pages",
    ],
  },
  {
    title: "Support",
    items: ["Chat", "Support Ticket", "Email"],
  },
  {
    title: "others",
    items: ["Charts", "UI Elements", "Authentication"],
  },
];

export function SideMenu({ isOpen }: SideMenuProps) {
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
          <span className="text-lg font-semibold text-gray-800">TailAdmin</span>
        </Link>
      </div>

      <nav className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-4 text-xs uppercase leading-[20px] text-gray-400">
              {section.title}
            </h3>
            <ul className="flex flex-col gap-1">
              {section.items.map((item, index) => {
                const active = section.title === "MENU" && index === 0;
                return (
                  <li key={item}>
                    <button
                      type="button"
                      className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-[#465fff] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="truncate">{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="pb-20">
          <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center">
            <h3 className="mb-2 font-semibold text-gray-900">
              #1 Tailwind CSS Dashboard
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Leading Tailwind CSS Admin Template with 400+ UI Component and
              Pages.
            </p>
            <a
              href="https://tailadmin.com/pricing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-lg bg-[#465fff] p-3 text-sm font-medium text-white transition hover:bg-[#364ed9]"
            >
              Purchase Plan
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
}
