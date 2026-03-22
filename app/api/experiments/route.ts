import { ActionLogType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserExperimentAccessInTenant, hasExperimentAccess } from "@/lib/experiments/access";
import {
  createExperimentInputSchema,
  experimentErrorResponseSchema,
  listExperimentsResponseSchema,
  upsertExperimentResponseSchema,
} from "@/lib/experiments/schemas";
import { readGuardrailsSnapshot, refreshExperimentStatusIfNeeded } from "@/lib/experiments/service";
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
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      headers,
    ),
  });
}

function toExperimentItem(experiment: {
  id: string;
  environmentId: string;
  featureFlagId: string | null;
  key: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  allocationMode: "FIXED" | "BANDIT";
  targetType: "USER" | "FEATURE" | "PAGE";
  targetValue: string | null;
  segmentCountry: string | null;
  segmentDevice: "ANY" | "MOBILE" | "DESKTOP" | "TABLET";
  stickyBucketing: boolean;
  gradualRolloutEnabled: boolean;
  rolloutPercent: number;
  autoStart: boolean;
  autoStop: boolean;
  startAt: Date | null;
  endAt: Date | null;
  goalEventName: string;
  guardrailMaxErrorRate: number | null;
  guardrailMinRevenue: number | null;
  createdAt: Date;
  updatedAt: Date;
  environment: { name: string };
  featureFlag: { name: string } | null;
  variants: Array<{
    id: string;
    key: string;
    name: string;
    trafficPercent: number;
    isControl: boolean;
  }>;
}) {
  return {
    id: experiment.id,
    environmentId: experiment.environmentId,
    environmentName: experiment.environment.name,
    featureFlagId: experiment.featureFlagId,
    featureFlagName: experiment.featureFlag?.name ?? null,
    key: experiment.key,
    name: experiment.name,
    description: experiment.description,
    status: experiment.status,
    allocationMode: experiment.allocationMode,
    targetType: experiment.targetType,
    targetValue: experiment.targetValue,
    segmentCountry: experiment.segmentCountry,
    segmentDevice: experiment.segmentDevice,
    stickyBucketing: experiment.stickyBucketing,
    gradualRolloutEnabled: experiment.gradualRolloutEnabled,
    rolloutPercent: experiment.rolloutPercent,
    autoStart: experiment.autoStart,
    autoStop: experiment.autoStop,
    startAt: experiment.startAt ? experiment.startAt.toISOString() : null,
    endAt: experiment.endAt ? experiment.endAt.toISOString() : null,
    goalEventName: experiment.goalEventName,
    guardrailMaxErrorRate: experiment.guardrailMaxErrorRate,
    guardrailMinRevenue: experiment.guardrailMinRevenue,
    createdAt: experiment.createdAt.toISOString(),
    updatedAt: experiment.updatedAt.toISOString(),
    variants: experiment.variants,
  };
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`experiments:get:${membership.userId}`, 120, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`, requestId, rateLimitHeaders);
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasExperimentAccess("read", access.roleNames, access.permissions)) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to view experiments.", requestId, rateLimitHeaders);
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  if (limitParam && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid limit.", requestId, rateLimitHeaders);
  }

  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;

  const experiments = await prisma.experiment.findMany({
    where: {
      tenantId: membership.tenantId,
      deletedAt: null,
      ...(hasPagination && cursor ? { id: { gt: cursor } } : {}),
      ...(hasSearch
        ? {
            OR: [
              { key: { contains: queryParam } },
              { name: { contains: queryParam } },
              { description: { contains: queryParam } },
            ],
          }
        : {}),
    },
    include: {
      environment: { select: { name: true } },
      featureFlag: { select: { name: true } },
      variants: {
        select: {
          id: true,
          key: true,
          name: true,
          trafficPercent: true,
          isControl: true,
        },
        orderBy: [{ key: "asc" }],
      },
    },
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
  });

  for (const experiment of experiments) {
    await refreshExperimentStatusIfNeeded(prisma, experiment);
  }

  const pageItems = hasPagination && limit ? experiments.slice(0, limit) : experiments;
  const nextCursor = hasPagination && limit && experiments.length > limit ? experiments[limit - 1]?.id ?? null : null;

  const payload = listExperimentsResponseSchema.parse({
    success: true,
    items: pageItems.map(toExperimentItem),
    nextCursor,
  });

  logApiEvent({
    requestId,
    route: "/api/experiments",
    userId: membership.userId,
    level: "info",
    message: "Experiments listed.",
    extra: { itemCount: payload.items.length, hasSearch, hasPagination },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), rateLimitHeaders),
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`experiments:create:${membership.userId}`, 30, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`, requestId, rateLimitHeaders);
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasExperimentAccess("write", access.roleNames, access.permissions)) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to create experiments.", requestId, rateLimitHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = createExperimentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid experiment data.", requestId, rateLimitHeaders);
  }

  const input = parsedInput.data;

  const environment = await prisma.environment.findFirst({
    where: {
      id: input.environmentId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });
  if (!environment) {
    return jsonError(404, "ENVIRONMENT_NOT_FOUND", "Environment not found.", requestId, rateLimitHeaders);
  }

  if (input.featureFlagId) {
    const featureFlag = await prisma.featureFlag.findFirst({
      where: {
        id: input.featureFlagId,
        tenantId: membership.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!featureFlag) {
      return jsonError(404, "FEATURE_FLAG_NOT_FOUND", "Feature flag not found.", requestId, rateLimitHeaders);
    }
  }

  if (input.status === "RUNNING") {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const snapshot = await readGuardrailsSnapshot("non-existent-id", seventyTwoHoursAgo);
    if (input.guardrailMaxErrorRate !== null && input.guardrailMaxErrorRate !== undefined && snapshot.errorRate > input.guardrailMaxErrorRate) {
      return jsonError(422, "GUARDRAIL_BLOCKED", "Guardrail blocked experiment start: error rate too high.", requestId, rateLimitHeaders);
    }
    if (input.guardrailMinRevenue !== null && input.guardrailMinRevenue !== undefined && snapshot.revenuePerExposure < input.guardrailMinRevenue) {
      return jsonError(422, "GUARDRAIL_BLOCKED", "Guardrail blocked experiment start: revenue per exposure too low.", requestId, rateLimitHeaders);
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const experiment = await tx.experiment.create({
        data: {
          tenantId: membership.tenantId,
          environmentId: input.environmentId,
          featureFlagId: input.featureFlagId ?? null,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          allocationMode: input.allocationMode,
          targetType: input.targetType,
          targetValue: input.targetValue ?? null,
          segmentCountry: input.segmentCountry ?? null,
          segmentDevice: input.segmentDevice,
          stickyBucketing: input.stickyBucketing,
          gradualRolloutEnabled: input.gradualRolloutEnabled,
          rolloutPercent: input.rolloutPercent,
          autoStart: input.autoStart,
          autoStop: input.autoStop,
          startAt: input.startAt ? new Date(input.startAt) : null,
          endAt: input.endAt ? new Date(input.endAt) : null,
          goalEventName: input.goalEventName,
          guardrailMaxErrorRate: input.guardrailMaxErrorRate ?? null,
          guardrailMinRevenue: input.guardrailMinRevenue ?? null,
          createdByUserId: membership.userId,
          updatedByUserId: membership.userId,
          variants: {
            create: input.variants.map((variant) => ({
              key: variant.key,
              name: variant.name,
              trafficPercent: variant.trafficPercent,
              isControl: variant.isControl,
            })),
          },
        },
        include: {
          environment: { select: { name: true } },
          featureFlag: { select: { name: true } },
          variants: {
            select: { id: true, key: true, name: true, trafficPercent: true, isControl: true },
            orderBy: [{ key: "asc" }],
          },
        },
      });

      await logAction({
        tx,
        tenantId: membership.tenantId,
        userId: membership.userId,
        actionType: ActionLogType.CREATE,
        resource: "experiment",
        resourceId: experiment.id,
        details: {
          key: experiment.key,
          name: experiment.name,
          allocationMode: experiment.allocationMode,
          status: experiment.status,
        },
      });

      return experiment;
    });

    const payload = upsertExperimentResponseSchema.parse({
      success: true,
      item: toExperimentItem(created),
    });

    logApiEvent({
      requestId,
      route: "/api/experiments",
      userId: membership.userId,
      level: "info",
      message: "Experiment created.",
      extra: { experimentId: created.id },
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), rateLimitHeaders),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "EXPERIMENT_KEY_EXISTS", "An experiment with this key already exists.", requestId, rateLimitHeaders);
    }
    return jsonError(500, "INTERNAL_ERROR", "Could not create experiment.", requestId, rateLimitHeaders);
  }
}
