import { NextResponse } from "next/server";
import {
  getActiveTenantIdCookie,
} from "@/lib/auth/active-tenant";
import {
  projectErrorResponseSchema,
  updateProjectInputSchema,
  upsertProjectResponseSchema,
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
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { projectId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = updateProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      tenantId: projectId,
    },
    select: { id: true },
  });

  if (!membership) {
    return jsonError(404, "NOT_FOUND", "Project not found.");
  }

  const updated = await prisma.tenant.update({
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

  const activeTenantId = await getActiveTenantIdCookie();
  const payload = upsertProjectResponseSchema.parse({
    success: true,
    item: {
      ...toItem(updated),
      isActive: activeTenantId === updated.id,
    },
  });

  return NextResponse.json(payload);
}
