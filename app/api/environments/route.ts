import { NextResponse } from "next/server";
import { ActionLogType, Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserEnvironmentAccessInTenant, hasEnvironmentAccess } from "@/lib/environments/access";
import {
  createEnvironmentInputSchema,
  environmentErrorResponseSchema,
  listEnvironmentsResponseSchema,
  upsertEnvironmentResponseSchema,
} from "@/lib/environments/schemas";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";

function jsonError(status: number, code: string, message: string, requestId: string) {
  const payload = environmentErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, {
    status,
    headers: { "x-request-id": requestId },
  });
}

function toItem(item: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
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

  const rateLimit = consumeRateLimit(`environments:get:${membership.userId}`, 120, 60_000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  const access = await getUserEnvironmentAccessInTenant(
    membership.userId,
    membership.tenantId,
  );
  if (!access || !hasEnvironmentAccess("read", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to view environments.",
      requestId,
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  if (limitParam && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid limit.", requestId);
  }
  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;

  const where = {
    tenantId: membership.tenantId,
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
  };

  const items = await prisma.environment.findMany({
    where,
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const pageItems = hasPagination && limit ? items.slice(0, limit) : items;
  const nextCursor =
    hasPagination && limit && items.length > limit
      ? items[limit - 1]?.id ?? null
      : null;

  const payload = listEnvironmentsResponseSchema.parse({
    success: true,
    items: pageItems.map(toItem),
    nextCursor,
  });

  logApiEvent({
    requestId,
    route: "/api/environments",
    userId: membership.userId,
    level: "info",
    message: "Environments listed.",
    extra: { itemCount: payload.items.length, hasSearch, hasPagination },
  });

  return NextResponse.json(payload, {
    headers: { "x-request-id": requestId },
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(`environments:create:${membership.userId}`, 25, 60_000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  const access = await getUserEnvironmentAccessInTenant(
    membership.userId,
    membership.tenantId,
  );
  if (!access || !hasEnvironmentAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to create environments.",
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = createEnvironmentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid environment data.", requestId);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.environment.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: membership.userId,
          ...parsedInput.data,
        },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await logAction({
        tx,
        tenantId: membership.tenantId,
        userId: membership.userId,
        actionType: ActionLogType.CREATE,
        resource: "environment",
        resourceId: item.id,
        details: {
          key: item.key,
          name: item.name,
          enabled: item.enabled,
        },
      });

      return item;
    });

    const payload = upsertEnvironmentResponseSchema.parse({
      success: true,
      item: toItem(created),
    });

    logApiEvent({
      requestId,
      route: "/api/environments",
      userId: membership.userId,
      level: "info",
      message: "Environment created.",
      extra: { environmentId: created.id },
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(
        409,
        "ENVIRONMENT_KEY_ALREADY_EXISTS",
        "An environment with this key already exists.",
        requestId,
      );
    }

    logApiEvent({
      requestId,
      route: "/api/environments",
      userId: membership.userId,
      level: "error",
      message: "Could not create environment.",
    });
    return jsonError(500, "INTERNAL_ERROR", "Could not create environment.", requestId);
  }
}
