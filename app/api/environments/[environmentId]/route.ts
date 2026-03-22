import { NextResponse } from "next/server";
import { ActionLogType, Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { logAction } from "@/lib/audit/action-log";
import { getUserEnvironmentAccessInTenant, hasEnvironmentAccess } from "@/lib/environments/access";
import {
  environmentErrorResponseSchema,
  updateEnvironmentInputSchema,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ environmentId: string }> },
) {
  const requestId = createRequestId();
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(`environments:update:${membership.userId}`, 50, 60_000);
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
      "You do not have permission to edit environments.",
      requestId,
    );
  }

  const { environmentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = updateEnvironmentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid environment data.", requestId);
  }

  const existing = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Environment not found.", requestId);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.environment.update({
        where: { id: environmentId },
        data: parsedInput.data,
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
        actionType: ActionLogType.UPDATE,
        resource: "environment",
        resourceId: environmentId,
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
      item: toItem(updated),
    });

    logApiEvent({
      requestId,
      route: "/api/environments/[environmentId]",
      userId: membership.userId,
      level: "info",
      message: "Environment updated.",
      extra: { environmentId },
    });

    return NextResponse.json(payload, {
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
      route: "/api/environments/[environmentId]",
      userId: membership.userId,
      level: "error",
      message: "Could not update environment.",
      extra: { environmentId },
    });
    return jsonError(500, "INTERNAL_ERROR", "Could not update environment.", requestId);
  }
}
