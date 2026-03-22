import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  deleteEnvironmentResponseSchema,
  environmentErrorResponseSchema,
  updateEnvironmentInputSchema,
  upsertEnvironmentResponseSchema,
} from "@/lib/environments/schemas";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = environmentErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, { status });
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
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { environmentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = updateEnvironmentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid environment data.");
  }

  const existing = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Environment not found.");
  }

  try {
    const updated = await prisma.environment.update({
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

    const payload = upsertEnvironmentResponseSchema.parse({
      success: true,
      item: toItem(updated),
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(
        409,
        "ENVIRONMENT_KEY_ALREADY_EXISTS",
        "An environment with this key already exists.",
      );
    }

    return jsonError(500, "INTERNAL_ERROR", "Could not update environment.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ environmentId: string }> },
) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { environmentId } = await params;

  const existing = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Environment not found.");
  }

  await prisma.environment.delete({
    where: {
      id: environmentId,
    },
  });

  const payload = deleteEnvironmentResponseSchema.parse({
    success: true,
    id: environmentId,
  });

  return NextResponse.json(payload);
}
