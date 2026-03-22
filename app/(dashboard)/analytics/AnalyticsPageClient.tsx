"use client";

import { useState } from "react";
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
import { useAnalyticsOverviewQuery } from "@/hooks/use-experiments";

type AnalyticsPageClientProps = {
  userName: string;
  userEmail: string;
};

function toPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function AnalyticsPageClient({ userName, userEmail }: AnalyticsPageClientProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const analyticsQuery = useAnalyticsOverviewQuery();
  const analyticsData = analyticsQuery.data;

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
          <div className="mb-6">
            <H1>{t("analytics.title")}</H1>
            <Subtitle>{t("analytics.subtitle")}</Subtitle>
          </div>

          {analyticsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={`analytics-summary-skeleton-${index}`}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-6 w-16" />
                </Card>
              ))}
            </div>
          ) : analyticsQuery.error ? (
            <Alert variant="error">{(analyticsQuery.error as Error).message}</Alert>
          ) : analyticsData ? (
            <>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.featureFlagsTotal")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{analyticsData.summary.featureFlagsTotal}</p>
                </Card>
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.featureFlagsEnabled")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{analyticsData.summary.featureFlagsEnabled}</p>
                </Card>
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.experimentsTotal")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{analyticsData.summary.experimentsTotal}</p>
                </Card>
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.experimentsRunning")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{analyticsData.summary.experimentsRunning}</p>
                </Card>
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.eventsLast7Days")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{analyticsData.summary.eventsLast7Days}</p>
                </Card>
                <Card>
                  <p className="text-xs uppercase text-slate-500">{t("analytics.revenueLast7Days")}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">${analyticsData.summary.revenueLast7Days.toFixed(2)}</p>
                </Card>
              </div>

              <Card className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <H2>{t("analytics.experimentsPerformance")}</H2>
                  <Badge variant="info">{analyticsData.experiments.length}</Badge>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <Table className="w-full min-w-[980px] text-left text-sm">
                    <Thead>
                      <Tr className="text-xs uppercase tracking-wide text-slate-500">
                        <Th className="pb-3">{t("analytics.tableExperiment")}</Th>
                        <Th className="pb-3">{t("analytics.tableVariant")}</Th>
                        <Th className="pb-3">{t("analytics.tableExposures")}</Th>
                        <Th className="pb-3">{t("analytics.tableCtr")}</Th>
                        <Th className="pb-3">{t("analytics.tableConversion")}</Th>
                        <Th className="pb-3">{t("analytics.tableRevenue")}</Th>
                      </Tr>
                    </Thead>
                    <Tbody className="text-slate-700">
                      {analyticsData.experiments.flatMap((experiment) =>
                        experiment.variants.map((variant) => (
                          <Tr key={`${experiment.experimentId}-${variant.variantId}`} className="border-t border-slate-100">
                            <td className="py-3">
                              <p className="font-semibold text-slate-900">{experiment.name}</p>
                              <p className="text-xs text-slate-500">{experiment.key}</p>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="neutral">{variant.variantKey}</Badge>
                                <span>{variant.variantName}</span>
                              </div>
                            </td>
                            <td className="py-3">{variant.exposures}</td>
                            <td className="py-3">{toPercent(variant.ctr)}</td>
                            <td className="py-3">{toPercent(variant.conversionRate)}</td>
                            <td className="py-3">${variant.revenue.toFixed(2)}</td>
                          </Tr>
                        )),
                      )}
                    </Tbody>
                  </Table>
                </div>
              </Card>
            </>
          ) : null
          }
        </main>
      </div>
    </div>
  );
}
