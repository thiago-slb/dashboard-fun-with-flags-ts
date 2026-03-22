import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { getUserExperimentAccessInTenant, hasAnalyticsAccess } from "@/lib/experiments/access";
import { analyticsOverviewResponseSchema, experimentErrorResponseSchema } from "@/lib/experiments/schemas";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { buildNoStoreHeaders, buildRateLimitHeaders, mergeHeaders } from "@/lib/http/response-headers";
import { prisma } from "@/lib/prisma";
import { consumeRateLimitServer } from "@/lib/security/rate-limit";

function jsonError(
  status: number,
  code: string,
  message: string,
  requestId: string,
  headers?: Headers,
) {
  const payload = experimentErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, {
    status,
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), headers),
  });
}

export async function GET() {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`analytics:get:${membership.userId}`, 120, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`, requestId, rateLimitHeaders);
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasAnalyticsAccess(access.roleNames, access.permissions)) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to view analytics.", requestId, rateLimitHeaders);
  }

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [featureFlagsTotal, featureFlagsEnabled, experimentsTotal, experimentsRunning, eventsLast7Days, revenueLast7Days] =
    await Promise.all([
      prisma.featureFlag.count({ where: { tenantId: membership.tenantId, deletedAt: null } }),
      prisma.featureFlag.count({ where: { tenantId: membership.tenantId, deletedAt: null, enabled: true } }),
      prisma.experiment.count({ where: { tenantId: membership.tenantId, deletedAt: null } }),
      prisma.experiment.count({ where: { tenantId: membership.tenantId, deletedAt: null, status: "RUNNING" } }),
      prisma.experimentEvent.count({ where: { tenantId: membership.tenantId, occurredAt: { gte: since7d } } }),
      prisma.experimentEvent.aggregate({
        where: { tenantId: membership.tenantId, occurredAt: { gte: since7d }, revenue: { not: null } },
        _sum: { revenue: true },
      }),
    ]);

  const experiments = await prisma.experiment.findMany({
    where: {
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      key: true,
      name: true,
      status: true,
      goalEventName: true,
      variants: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 20,
  });

  const experimentsPayload = await Promise.all(
    experiments.map(async (experiment) => {
      const variants = await Promise.all(
        experiment.variants.map(async (variant) => {
          const [exposures, clicks, conversions, revenue] = await Promise.all([
            prisma.experimentEvent.count({
              where: {
                experimentId: experiment.id,
                variantId: variant.id,
                eventName: "exposure",
              },
            }),
            prisma.experimentEvent.count({
              where: {
                experimentId: experiment.id,
                variantId: variant.id,
                eventName: "clicked_cta",
              },
            }),
            prisma.experimentEvent.count({
              where: {
                experimentId: experiment.id,
                variantId: variant.id,
                eventName: experiment.goalEventName,
              },
            }),
            prisma.experimentEvent.aggregate({
              where: {
                experimentId: experiment.id,
                variantId: variant.id,
                revenue: { not: null },
              },
              _sum: { revenue: true },
            }),
          ]);

          const ctr = exposures > 0 ? clicks / exposures : 0;
          const conversionRate = exposures > 0 ? conversions / exposures : 0;
          return {
            variantId: variant.id,
            variantKey: variant.key,
            variantName: variant.name,
            exposures,
            clicks,
            conversions,
            revenue: revenue._sum.revenue ?? 0,
            ctr,
            conversionRate,
          };
        }),
      );

      return {
        experimentId: experiment.id,
        key: experiment.key,
        name: experiment.name,
        status: experiment.status,
        goalEventName: experiment.goalEventName,
        variants,
      };
    }),
  );

  const payload = analyticsOverviewResponseSchema.parse({
    success: true,
    summary: {
      featureFlagsTotal,
      featureFlagsEnabled,
      experimentsTotal,
      experimentsRunning,
      eventsLast7Days,
      revenueLast7Days: revenueLast7Days._sum.revenue ?? 0,
    },
    experiments: experimentsPayload,
  });

  logApiEvent({
    requestId,
    route: "/api/analytics/overview",
    userId: membership.userId,
    level: "info",
    message: "Analytics overview loaded.",
    extra: {
      experiments: payload.experiments.length,
    },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), rateLimitHeaders),
  });
}
