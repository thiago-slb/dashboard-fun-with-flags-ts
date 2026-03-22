import { ActionLogType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserFeatureFlagAccessInTenant, hasFeatureFlagAccess } from "@/lib/feature-flags/access";
import {
  createFeatureFlagInputSchema,
  featureFlagErrorResponseSchema,
  listFeatureFlagsResponseSchema,
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

export async function GET(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = await consumeRateLimitServer(`feature-flags:get:${membership.userId}`, 120, 60_000);
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
  if (!access || !hasFeatureFlagAccess("read", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to view feature flags.",
      requestId,
      rateLimitHeaders,
    );
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

  const items = await prisma.featureFlag.findMany({
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
              { environment: { key: { contains: queryParam } } },
              { environment: { name: { contains: queryParam } } },
            ],
          }
        : {}),
    },
    include: {
      environment: {
        select: {
          key: true,
          name: true,
        },
      },
    },
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
  });

  const pageItems = hasPagination && limit ? items.slice(0, limit) : items;
  const nextCursor =
    hasPagination && limit && items.length > limit ? items[limit - 1]?.id ?? null : null;

  const payload = listFeatureFlagsResponseSchema.parse({
    success: true,
    items: pageItems.map(toItem),
    nextCursor,
  });

  logApiEvent({
    requestId,
    route: "/api/feature-flags",
    userId: membership.userId,
    level: "info",
    message: "Feature flags listed.",
    extra: {
      itemCount: payload.items.length,
      hasSearch,
      hasPagination,
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

  const rateLimit = await consumeRateLimitServer(`feature-flags:create:${membership.userId}`, 30, 60_000);
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
      "You do not have permission to create feature flags.",
      requestId,
      rateLimitHeaders,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId, rateLimitHeaders);
  }

  const parsedInput = createFeatureFlagInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid feature flag data.", requestId, rateLimitHeaders);
  }

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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.featureFlag.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: membership.userId,
          updatedByUserId: membership.userId,
          ...parsedInput.data,
          allowListEmails: normalizeAllowListEmails(parsedInput.data.allowListEmails),
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
        actionType: ActionLogType.CREATE,
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
      item: toItem(created),
    });

    logApiEvent({
      requestId,
      route: "/api/feature-flags",
      userId: membership.userId,
      level: "info",
      message: "Feature flag created.",
      extra: { flagId: created.id },
    });

    return NextResponse.json(payload, {
      status: 201,
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
      route: "/api/feature-flags",
      userId: membership.userId,
      level: "error",
      message: "Could not create feature flag.",
    });

    return jsonError(500, "INTERNAL_ERROR", "Could not create feature flag.", requestId, rateLimitHeaders);
  }
}
