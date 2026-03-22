import { ActionLogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { setActiveTenantCookie } from "@/lib/auth/active-tenant";
import { logAction } from "@/lib/audit/action-log";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { getUserProjectAccessInTenant, hasProjectAccess } from "@/lib/projects/access";
import {
  projectErrorResponseSchema,
  setActiveProjectInputSchema,
  setActiveProjectResponseSchema,
} from "@/lib/projects/schemas";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/auth/session";

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

export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(`projects:switch:${session.userId}`, 80, 60_000);
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

  const parsedInput = setActiveProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.", requestId);
  }

  const access = await getUserProjectAccessInTenant(
    session.userId,
    parsedInput.data.projectId,
  );
  if (!access) {
    return jsonError(404, "NOT_FOUND", "Project not found.", requestId);
  }
  if (!hasProjectAccess("read", access.roleNames, access.permissions)) {
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have permission to access this project.",
      requestId,
    );
  }

  await setActiveTenantCookie(parsedInput.data.projectId);

  await logAction({
    tenantId: parsedInput.data.projectId,
    userId: session.userId,
    actionType: ActionLogType.UPDATE,
    resource: "project_active_switch",
    resourceId: parsedInput.data.projectId,
    details: {
      projectId: parsedInput.data.projectId,
    },
  });

  const payload = setActiveProjectResponseSchema.parse({
    success: true,
    projectId: parsedInput.data.projectId,
  });

  logApiEvent({
    requestId,
    route: "/api/projects/active",
    userId: session.userId,
    level: "info",
    message: "Active project switched.",
    extra: { projectId: parsedInput.data.projectId },
  });

  return NextResponse.json(payload, {
    headers: { "x-request-id": requestId },
  });
}
