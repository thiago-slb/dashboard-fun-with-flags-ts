import { NextResponse } from "next/server";
import { setActiveTenantCookie } from "@/lib/auth/active-tenant";
import {
  projectErrorResponseSchema,
  setActiveProjectInputSchema,
  setActiveProjectResponseSchema,
} from "@/lib/projects/schemas";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = projectErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = setActiveProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      tenantId: parsedInput.data.projectId,
    },
    select: { id: true },
  });

  if (!membership) {
    return jsonError(404, "NOT_FOUND", "Project not found.");
  }

  await setActiveTenantCookie(parsedInput.data.projectId);

  const payload = setActiveProjectResponseSchema.parse({
    success: true,
    projectId: parsedInput.data.projectId,
  });

  return NextResponse.json(payload);
}
