"use client";

import { useState, type ReactNode } from "react";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";

type DashboardPageClientProps = {
  userName: string;
  userEmail: string;
};

export function DashboardPageClient({
  userName,
  userEmail,
}: DashboardPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const summaryCards: Array<{
    title: string;
    value: string;
    hint: string;
    hintColor: string;
    icon: ReactNode;
  }> = [
    {
      title: "Total Flags",
      value: "128",
      hint: "+6 this week",
      hintColor: "text-emerald-600",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V18.5C20 19.3284 19.3284 20 18.5 20H5.5C4.67157 20 4 19.3284 4 18.5V5.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 9H16M8 12H16M8 15H12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      title: "Enabled in Production",
      value: "74",
      hint: "57.8% of catalog",
      hintColor: "text-gray-500",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      title: "Kill Switches Armed",
      value: "9",
      hint: "2 require owner review",
      hintColor: "text-amber-600",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M9.5 4H14.5L19 8.5V15.5L14.5 20H9.5L5 15.5V8.5L9.5 4Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M12 8V12M12 15H12.01" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      title: "Flags Expiring Soon",
      value: "14",
      hint: "next 14 days",
      hintColor: "text-red-600",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path d="M7 3V6M17 3V6" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 9.5H20" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 13L12 17" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
  ];

  const environmentStatus = [
    { name: "Production", healthy: 96, risky: 4 },
    { name: "Staging", healthy: 88, risky: 12 },
    { name: "Development", healthy: 81, risky: 19 },
  ];

  const criticalFlags = [
    {
      key: "checkout_v2",
      owner: "Payments Team",
      rollout: "65%",
      exposure: "High",
    },
    {
      key: "search_semantic_ranking",
      owner: "Discovery Team",
      rollout: "20%",
      exposure: "Medium",
    },
    {
      key: "realtime_inventory_sync",
      owner: "Catalog Team",
      rollout: "100%",
      exposure: "High",
    },
  ];

  const recentChanges = [
    {
      action: "Enabled",
      flag: "pricing_dynamic_tiers",
      actor: "ana@funwithflags.com",
      when: "5m ago",
    },
    {
      action: "Rollback",
      flag: "checkout_v2",
      actor: "ops-bot",
      when: "22m ago",
    },
    {
      action: "Updated rules",
      flag: "signup_friction_guard",
      actor: "leo@funwithflags.com",
      when: "48m ago",
    },
    {
      action: "Created",
      flag: "ai_recommendations_feed",
      actor: "bia@funwithflags.com",
      when: "1h ago",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#f8fbff] to-[#f4f6fb]">
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
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={userName}
          userEmail={userEmail}
        />

        <main className="p-5 sm:p-7">
        

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.title}</p>
                    <p className="mt-2 text-3xl font-semibold leading-none text-slate-900">
                      {item.value}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#465fff]/10 text-[#465fff]">
                    {item.icon}
                  </span>
                </div>
                <p className={`mt-3 text-xs font-medium ${item.hintColor}`}>{item.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Environment Health
                </h2>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  Last sync: 2m ago
                </span>
              </div>

              <div className="space-y-5">
                {environmentStatus.map((env) => (
                  <div key={env.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{env.name}</span>
                      <span className="text-xs text-slate-500">
                        {env.healthy}% healthy / {env.risky}% risky
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${env.healthy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Rollout Alerts
              </h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  `checkout_v2` rollback triggered in EU.
                </li>
                <li className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                  `promo_engine_live` error rate above threshold.
                </li>
                <li className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
                  `search_semantic_ranking` ready for +10% rollout.
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Critical Flags
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 font-medium">Flag</th>
                      <th className="pb-3 font-medium">Owner</th>
                      <th className="pb-3 font-medium">Rollout</th>
                      <th className="pb-3 font-medium">Exposure</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {criticalFlags.map((item) => (
                      <tr key={item.key} className="border-t border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{item.key}</td>
                        <td className="py-3">{item.owner}</td>
                        <td className="py-3">{item.rollout}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              item.exposure === "High"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.exposure}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Recent Changes
              </h2>
              <ul className="mt-4 space-y-3">
                {recentChanges.map((change) => (
                  <li
                    key={`${change.flag}-${change.when}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {change.action} `{change.flag}`
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      by {change.actor} • {change.when}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
