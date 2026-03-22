"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
      <SideMenu isOpen={sidebarOpen} />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-gray-900/50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">eCommerce</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, here is your dashboard overview.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {["Customers", "Orders", "Revenue", "Growth"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <p className="text-sm text-gray-500">{item}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  3,782
                </p>
                <p className="mt-2 text-sm text-emerald-600">+11.01%</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
