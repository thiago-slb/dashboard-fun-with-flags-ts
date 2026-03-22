import { ActionLogType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getActiveTenantIdCookie,
} from "@/lib/auth/active-tenant";
import { logAction } from "@/lib/audit/action-log";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { getUserProjectAccessInTenant, hasProjectAccess } from "@/lib/projects/access";
import {
  projectErrorResponseSchema,
  updateProjectInputSchema,
  upsertProjectResponseSchema,
} from "@/lib/projects/schemas";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string, requestId: string) {
  const payload = projectErrorResponseSchema.parse({
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
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    isActive: false,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const requestId = createRequestId();
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const { projectId } = await params;
  const rateLimit = consumeRateLimit(`projects:update:${session.userId}`, 40, 60_000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = updateProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.", requestId);
  }

  const access = await getUserProjectAccessInTenant(session.userId, projectId);
  if (!access) {
    return jsonError(404, "NOT_FOUND", "Project not found.", requestId);
  }
  if (!hasProjectAccess("write", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to edit this project.",
      requestId,
    );
  }

  let updated: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
  try {
    updated = await prisma.tenant.update({
      where: { id: projectId },
      data: {
        name: parsedInput.data.name,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return jsonError(404, "NOT_FOUND", "Project not found.", requestId);
    }

    logApiEvent({
      requestId,
      route: "/api/projects/[projectId]",
      userId: session.userId,
      level: "error",
      message: "Could not update project.",
      extra: { projectId },
    });
    return jsonError(500, "INTERNAL_ERROR", "Could not update project.", requestId);
  }

  const activeTenantId = await getActiveTenantIdCookie();
  const payload = upsertProjectResponseSchema.parse({
    success: true,
    item: {
      ...toItem(updated),
      isActive: activeTenantId === updated.id,
    },
  });

  await logAction({
    tenantId: projectId,
    userId: session.userId,
    actionType: ActionLogType.UPDATE,
    resource: "project",
    resourceId: projectId,
    details: {
      name: updated.name,
    },
  });

  logApiEvent({
    requestId,
    route: "/api/projects/[projectId]",
    userId: session.userId,
    level: "info",
    message: "Project updated.",
    extra: { projectId },
  });

  return NextResponse.json(payload, {
    headers: { "x-request-id": requestId },
  });
}
