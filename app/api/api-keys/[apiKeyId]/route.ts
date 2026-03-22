import { ActionLogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserApiKeyAccessInTenant, hasApiKeyAccess } from "@/lib/api-keys/access";
import {
  apiKeyErrorResponseSchema,
  deleteApiKeyResponseSchema,
  updateApiKeyInputSchema,
  upsertApiKeyResponseSchema,
} from "@/lib/api-keys/schemas";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import {
  buildNoStoreHeaders,
  buildRateLimitHeaders,
  mergeHeaders,
} from "@/lib/http/response-headers";
import { prisma } from "@/lib/prisma";
import { consumeRateLimitServer } from "@/lib/security/rate-limit";

function jsonError(
  status: number,
  code: string,
  message: string,
  requestId: string,
  headers?: Headers,
) {
  const payload = apiKeyErrorResponseSchema.parse({
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

function toItem(apiKey: {
  id: string;
  environmentId: string;
  environment: {
    key: string;
    name: string;
  };
  name: string;
  keyPrefix: string;
  canReadFeatureFlags: boolean;
  canWriteFeatureFlags: boolean;
  canReadEnvironments: boolean;
  canWriteEnvironments: boolean;
  canReadProjects: boolean;
  canWriteProjects: boolean;
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: apiKey.id,
    environmentId: apiKey.environmentId,
    environmentKey: apiKey.environment.key,
    environmentName: apiKey.environment.name,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    canReadFeatureFlags: apiKey.canReadFeatureFlags,
    canWriteFeatureFlags: apiKey.canWriteFeatureFlags,
    canReadEnvironments: apiKey.canReadEnvironments,
    canWriteEnvironments: apiKey.canWriteEnvironments,
    canReadProjects: apiKey.canReadProjects,
    canWriteProjects: apiKey.canWriteProjects,
    enabled: apiKey.enabled,
    lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(
    `api-keys:update:${membership.userId}`,
    50,
    60_000,
  );
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

  const access = await getUserApiKeyAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasApiKeyAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to update API keys.",
      requestId,
    );
  }

  const { apiKeyId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = updateApiKeyInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid API key data.",
      requestId,
      rateLimitHeaders,
    );
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
      return jsonError(
        404,
        "ENVIRONMENT_NOT_FOUND",
        "Environment not found.",
        requestId,
        rateLimitHeaders,
      );
    }
  }

  const existing = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "API key not found.", requestId, rateLimitHeaders);
  }

  const updateData = { ...parsedInput.data };
  if (updateData.canWriteFeatureFlags === true) {
    updateData.canReadFeatureFlags = true;
  }
  if (updateData.canReadFeatureFlags === false) {
    updateData.canWriteFeatureFlags = false;
  }
  if (updateData.canWriteEnvironments === true) {
    updateData.canReadEnvironments = true;
  }
  if (updateData.canReadEnvironments === false) {
    updateData.canWriteEnvironments = false;
  }
  if (updateData.canWriteProjects === true) {
    updateData.canReadProjects = true;
  }
  if (updateData.canReadProjects === false) {
    updateData.canWriteProjects = false;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.apiKey.update({
      where: { id: apiKeyId },
      data: updateData,
      select: {
        id: true,
        environmentId: true,
        environment: {
          select: {
            key: true,
            name: true,
          },
        },
        name: true,
        keyPrefix: true,
        canReadFeatureFlags: true,
        canWriteFeatureFlags: true,
        canReadEnvironments: true,
        canWriteEnvironments: true,
        canReadProjects: true,
        canWriteProjects: true,
        enabled: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAction({
      tx,
      tenantId: membership.tenantId,
      userId: membership.userId,
      actionType: ActionLogType.UPDATE,
      resource: "api_key",
      resourceId: item.id,
      details: {
        name: item.name,
        environmentId: item.environmentId,
        enabled: item.enabled,
      },
    });

    return item;
  });

  const payload = upsertApiKeyResponseSchema.parse({
    success: true,
    item: toItem(updated),
  });

  logApiEvent({
    requestId,
    route: "/api/api-keys/[apiKeyId]",
    userId: membership.userId,
    level: "info",
    message: "API key updated.",
    extra: { apiKeyId },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      rateLimitHeaders,
    ),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(
    `api-keys:delete:${membership.userId}`,
    30,
    60_000,
  );
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

  const access = await getUserApiKeyAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasApiKeyAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to delete API keys.",
      requestId,
    );
  }

  const { apiKeyId } = await params;

  const existing = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "API key not found.", requestId, rateLimitHeaders);
  }

  await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: { id: apiKeyId },
      data: { deletedAt: new Date(), enabled: false },
    });

    await logAction({
      tx,
      tenantId: membership.tenantId,
      userId: membership.userId,
      actionType: ActionLogType.DELETE,
      resource: "api_key",
      resourceId: apiKeyId,
      details: {
        softDeleted: true,
      },
    });
  });

  const payload = deleteApiKeyResponseSchema.parse({
    success: true,
    id: apiKeyId,
  });

  logApiEvent({
    requestId,
    route: "/api/api-keys/[apiKeyId]",
    userId: membership.userId,
    level: "info",
    message: "API key deleted (soft).",
    extra: { apiKeyId },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      rateLimitHeaders,
    ),
  });
}
