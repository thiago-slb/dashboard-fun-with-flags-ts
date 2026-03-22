import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  createEnvironmentInputSchema,
  environmentErrorResponseSchema,
  listEnvironmentsResponseSchema,
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

export async function GET() {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const items = await prisma.environment.findMany({
    where: {
      tenantId: membership.tenantId,
    },
    orderBy: {
      createdAt: "asc",
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

  const payload = listEnvironmentsResponseSchema.parse({
    success: true,
    items: items.map(toItem),
  });

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = createEnvironmentInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid environment data.");
  }

  try {
    const created = await prisma.environment.create({
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

    const payload = upsertEnvironmentResponseSchema.parse({
      success: true,
      item: toItem(created),
    });

    return NextResponse.json(payload, { status: 201 });
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

    return jsonError(500, "INTERNAL_ERROR", "Could not create environment.");
  }
}
