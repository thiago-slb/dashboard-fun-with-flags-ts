import { ActionLogType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserFeatureFlagAccessInTenant, hasFeatureFlagAccess } from "@/lib/feature-flags/access";
import {
  deleteFeatureFlagResponseSchema,
  featureFlagErrorResponseSchema,
  updateFeatureFlagInputSchema,
  upsertFeatureFlagResponseSchema,
} from "@/lib/feature-flags/schemas";
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
  const payload = featureFlagErrorResponseSchema.parse({
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

function normalizeAllowListEmails(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of input) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = entry.trim().toLowerCase();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function toItem(item: {
  id: string;
  environmentId: string;
  environment: { key: string; name: string };
  key: string;
  name: string;
  description: string | null;
  allowListEmails: unknown;
  enabled: boolean;
  rolloutPercent: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    environmentId: item.environmentId,
    environmentKey: item.environment.key,
    environmentName: item.environment.name,
    key: item.key,
    name: item.name,
    description: item.description,
    allowListEmails: normalizeAllowListEmails(item.allowListEmails),
    enabled: item.enabled,
    rolloutPercent: item.rolloutPercent,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ flagId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`feature-flags:update:${membership.userId}`, 60, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
      rateLimitHeaders,
    );
  }

  const access = await getUserFeatureFlagAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasFeatureFlagAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to update feature flags.",
      requestId,
      rateLimitHeaders,
    );
  }

  const { flagId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = updateFeatureFlagInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid feature flag data.", requestId, rateLimitHeaders);
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

  const existing = await prisma.featureFlag.findFirst({
    where: {
      id: flagId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Feature flag not found.", requestId, rateLimitHeaders);
  }

  try {
    const updatePayload = {
      ...parsedInput.data,
      ...(parsedInput.data.allowListEmails !== undefined
        ? { allowListEmails: normalizeAllowListEmails(parsedInput.data.allowListEmails) }
        : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.featureFlag.update({
        where: { id: flagId },
        data: {
          ...updatePayload,
          updatedByUserId: membership.userId,
        },
        include: {
          environment: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      });

      await logAction({
        tx,
        tenantId: membership.tenantId,
        userId: membership.userId,
        actionType: ActionLogType.UPDATE,
        resource: "feature_flag",
        resourceId: item.id,
        details: {
          key: item.key,
          name: item.name,
          environmentId: item.environmentId,
          enabled: item.enabled,
          rolloutPercent: item.rolloutPercent,
          allowListCount: normalizeAllowListEmails(item.allowListEmails).length,
        },
      });

      return item;
    });

    const payload = upsertFeatureFlagResponseSchema.parse({
      success: true,
      item: toItem(updated),
    });

    logApiEvent({
      requestId,
      route: "/api/feature-flags/[flagId]",
      userId: membership.userId,
      level: "info",
      message: "Feature flag updated.",
      extra: { flagId },
    });

    return NextResponse.json(payload, {
      headers: mergeHeaders(
        { "x-request-id": requestId },
        buildNoStoreHeaders(),
        rateLimitHeaders,
      ),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "FLAG_KEY_ALREADY_EXISTS", "A flag with this key already exists.", requestId, rateLimitHeaders);
    }

    logApiEvent({
      requestId,
      route: "/api/feature-flags/[flagId]",
      userId: membership.userId,
      level: "error",
      message: "Could not update feature flag.",
      extra: { flagId },
    });

    return jsonError(500, "INTERNAL_ERROR", "Could not update feature flag.", requestId, rateLimitHeaders);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ flagId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`feature-flags:delete:${membership.userId}`, 40, 60_000);
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
      rateLimitHeaders,
    );
  }

  const access = await getUserFeatureFlagAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasFeatureFlagAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to delete feature flags.",
      requestId,
      rateLimitHeaders,
    );
  }

  const { flagId } = await params;

  const existing = await prisma.featureFlag.findFirst({
    where: {
      id: flagId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      key: true,
      name: true,
      environmentId: true,
    },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Feature flag not found.", requestId, rateLimitHeaders);
  }

  await prisma.$transaction(async (tx) => {
    await tx.featureFlag.update({
      where: { id: flagId },
      data: {
        deletedAt: new Date(),
        enabled: false,
        updatedByUserId: membership.userId,
      },
    });

    await logAction({
      tx,
      tenantId: membership.tenantId,
      userId: membership.userId,
      actionType: ActionLogType.DELETE,
      resource: "feature_flag",
      resourceId: flagId,
      details: {
        key: existing.key,
        name: existing.name,
        environmentId: existing.environmentId,
        softDeleted: true,
      },
    });
  });

  const payload = deleteFeatureFlagResponseSchema.parse({
    success: true,
    id: flagId,
  });

  logApiEvent({
    requestId,
    route: "/api/feature-flags/[flagId]",
    userId: membership.userId,
    level: "info",
    message: "Feature flag deleted (soft).",
    extra: { flagId },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      rateLimitHeaders,
    ),
  });
}
