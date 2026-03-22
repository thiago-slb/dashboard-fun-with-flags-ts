import { randomBytes } from "node:crypto";
import { ActionLogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserApiKeyAccessInTenant, hasApiKeyAccess } from "@/lib/api-keys/access";
import { hashApiKeyForStorage } from "@/lib/api-keys/crypto";
import {
  apiKeyErrorResponseSchema,
  createApiKeyInputSchema,
  createApiKeyResponseSchema,
  listApiKeysResponseSchema,
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

function generateApiKey() {
  return `fwf_${randomBytes(24).toString("base64url")}`;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`api-keys:get:${membership.userId}`, 120, 60_000);
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
  if (!access || !hasApiKeyAccess("read", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to view API keys.",
      requestId,
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";
  const environmentIdParam = url.searchParams.get("environmentId")?.trim() ?? "";

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  if (limitParam && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid limit.", requestId, rateLimitHeaders);
  }

  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;
  const hasEnvironmentFilter = environmentIdParam.length > 0;

  const where = {
    tenantId: membership.tenantId,
    deletedAt: null,
    ...(hasPagination && cursor ? { id: { gt: cursor } } : {}),
    ...(hasEnvironmentFilter ? { environmentId: environmentIdParam } : {}),
    ...(hasSearch
      ? {
          OR: [
            { name: { contains: queryParam } },
            { keyPrefix: { contains: queryParam } },
            { environment: { key: { contains: queryParam } } },
            { environment: { name: { contains: queryParam } } },
          ],
        }
      : {}),
  };

  const apiKeys = await prisma.apiKey.findMany({
    where,
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
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

  const pageItems = hasPagination && limit ? apiKeys.slice(0, limit) : apiKeys;
  const nextCursor =
    hasPagination && limit && apiKeys.length > limit ? apiKeys[limit - 1]?.id ?? null : null;

  const payload = listApiKeysResponseSchema.parse({
    success: true,
    items: pageItems.map(toItem),
    nextCursor,
  });

  logApiEvent({
    requestId,
    route: "/api/api-keys",
    userId: membership.userId,
    level: "info",
    message: "API keys listed.",
    extra: {
      itemCount: payload.items.length,
      hasSearch,
      hasPagination,
      hasEnvironmentFilter,
    },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      rateLimitHeaders,
    ),
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(
    `api-keys:create:${membership.userId}`,
    25,
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
      "You do not have permission to create API keys.",
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = createApiKeyInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid API key data.",
      requestId,
      rateLimitHeaders,
    );
  }

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

  const rawApiKey = generateApiKey();

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.apiKey.create({
      data: {
        tenantId: membership.tenantId,
        createdByUserId: membership.userId,
        environmentId: parsedInput.data.environmentId,
        name: parsedInput.data.name,
        keyPrefix: rawApiKey.slice(0, 14),
        secretHash: hashApiKeyForStorage(rawApiKey),
        canReadFeatureFlags: parsedInput.data.canReadFeatureFlags,
        canWriteFeatureFlags:
          parsedInput.data.canWriteFeatureFlags && parsedInput.data.canReadFeatureFlags,
        canReadEnvironments: parsedInput.data.canReadEnvironments,
        canWriteEnvironments:
          parsedInput.data.canWriteEnvironments && parsedInput.data.canReadEnvironments,
        canReadProjects: parsedInput.data.canReadProjects,
        canWriteProjects: parsedInput.data.canWriteProjects && parsedInput.data.canReadProjects,
        enabled: parsedInput.data.enabled,
      },
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
      actionType: ActionLogType.CREATE,
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

  const payload = createApiKeyResponseSchema.parse({
    success: true,
    item: toItem(created),
    apiKey: rawApiKey,
  });

  logApiEvent({
    requestId,
    route: "/api/api-keys",
    userId: membership.userId,
    level: "info",
    message: "API key created.",
    extra: { apiKeyId: created.id },
  });

  return NextResponse.json(payload, {
    status: 201,
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
      rateLimitHeaders,
    ),
  });
}
