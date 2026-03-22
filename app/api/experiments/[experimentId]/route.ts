import { ActionLogType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserExperimentAccessInTenant, hasExperimentAccess } from "@/lib/experiments/access";
import {
  deleteExperimentResponseSchema,
  experimentErrorResponseSchema,
  updateExperimentInputSchema,
  upsertExperimentResponseSchema,
} from "@/lib/experiments/schemas";
import { readGuardrailsSnapshot } from "@/lib/experiments/service";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`experiments:update:${membership.userId}`, 60, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`, requestId, rateLimitHeaders);
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasExperimentAccess("write", access.roleNames, access.permissions)) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to update experiments.", requestId, rateLimitHeaders);
  }

  const { experimentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = updateExperimentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid experiment data.", requestId, rateLimitHeaders);
  }

  const existing = await prisma.experiment.findFirst({
    where: {
      id: experimentId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      guardrailMaxErrorRate: true,
      guardrailMinRevenue: true,
    },
  });
  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Experiment not found.", requestId, rateLimitHeaders);
  }

  if (parsedInput.data.environmentId) {
    const environment = await prisma.environment.findFirst({
      where: {
        id: parsedInput.data.environmentId,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });
    if (!environment) {
      return jsonError(404, "ENVIRONMENT_NOT_FOUND", "Environment not found.", requestId, rateLimitHeaders);
    }
  }

  if (parsedInput.data.featureFlagId) {
    const featureFlag = await prisma.featureFlag.findFirst({
      where: {
        id: parsedInput.data.featureFlagId,
        tenantId: membership.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!featureFlag) {
      return jsonError(404, "FEATURE_FLAG_NOT_FOUND", "Feature flag not found.", requestId, rateLimitHeaders);
    }
  }

  const nextStatus = parsedInput.data.status ?? existing.status;
  if (nextStatus === "RUNNING") {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const snapshot = await readGuardrailsSnapshot(experimentId, since);
    const maxErrorRate = parsedInput.data.guardrailMaxErrorRate ?? existing.guardrailMaxErrorRate;
    const minRevenue = parsedInput.data.guardrailMinRevenue ?? existing.guardrailMinRevenue;

    if (maxErrorRate !== null && snapshot.errorRate > maxErrorRate) {
      return jsonError(422, "GUARDRAIL_BLOCKED", "Guardrail blocked experiment start: error rate too high.", requestId, rateLimitHeaders);
    }
    if (minRevenue !== null && snapshot.revenuePerExposure < minRevenue) {
      return jsonError(422, "GUARDRAIL_BLOCKED", "Guardrail blocked experiment start: revenue per exposure too low.", requestId, rateLimitHeaders);
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const {
        variants,
        startAt,
        endAt,
        ...restData
      } = parsedInput.data;

      const item = await tx.experiment.update({
        where: { id: experimentId },
        data: {
          ...restData,
          ...(startAt !== undefined ? { startAt: startAt ? new Date(startAt) : null } : {}),
          ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
          updatedByUserId: membership.userId,
          ...(variants
            ? {
                variants: {
                  deleteMany: {},
                  create: variants.map((variant) => ({
                    key: variant.key,
                    name: variant.name,
                    trafficPercent: variant.trafficPercent,
                    isControl: variant.isControl,
                  })),
                },
              }
            : {}),
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
        actionType: ActionLogType.UPDATE,
        resource: "experiment",
        resourceId: item.id,
        details: {
          key: item.key,
          name: item.name,
          status: item.status,
          allocationMode: item.allocationMode,
        },
      });

      return item;
    });

    const payload = upsertExperimentResponseSchema.parse({
      success: true,
      item: toExperimentItem(updated),
    });

    return NextResponse.json(payload, {
      headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), rateLimitHeaders),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "EXPERIMENT_KEY_EXISTS", "An experiment with this key already exists.", requestId, rateLimitHeaders);
    }
    return jsonError(500, "INTERNAL_ERROR", "Could not update experiment.", requestId, rateLimitHeaders);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`experiments:delete:${membership.userId}`, 30, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED", `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`, requestId, rateLimitHeaders);
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasExperimentAccess("write", access.roleNames, access.permissions)) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to delete experiments.", requestId, rateLimitHeaders);
  }

  const { experimentId } = await params;
  const existing = await prisma.experiment.findFirst({
    where: {
      id: experimentId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: { id: true, key: true, name: true },
  });
  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Experiment not found.", requestId, rateLimitHeaders);
  }

  await prisma.$transaction(async (tx) => {
    await tx.experiment.update({
      where: { id: experimentId },
      data: {
        deletedAt: new Date(),
        status: "COMPLETED",
        updatedByUserId: membership.userId,
      },
    });

    await logAction({
      tx,
      tenantId: membership.tenantId,
      userId: membership.userId,
      actionType: ActionLogType.DELETE,
      resource: "experiment",
      resourceId: experimentId,
      details: {
        key: existing.key,
        name: existing.name,
        softDeleted: true,
      },
    });
  });

  const payload = deleteExperimentResponseSchema.parse({
    success: true,
    id: experimentId,
  });

  logApiEvent({
    requestId,
    route: "/api/experiments/[experimentId]",
    userId: membership.userId,
    level: "info",
    message: "Experiment deleted (soft).",
    extra: { experimentId },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders(), rateLimitHeaders),
  });
}
