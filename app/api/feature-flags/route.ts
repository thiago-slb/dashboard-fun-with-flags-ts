import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  createFeatureFlagInputSchema,
  featureFlagErrorResponseSchema,
  listFeatureFlagsResponseSchema,
  upsertFeatureFlagResponseSchema,
} from "@/lib/feature-flags/schemas";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = featureFlagErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });

  return NextResponse.json(payload, { status });
}

export async function GET() {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const items = await prisma.featureFlag.findMany({
    where: {
      tenantId: membership.tenantId,
    },
    include: {
      environment: {
        select: {
          key: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const payload = listFeatureFlagsResponseSchema.parse({
    success: true,
    items: items.map((item) => ({
      ...item,
      environmentKey: item.environment.key,
      environmentName: item.environment.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
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

  const parsedInput = createFeatureFlagInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid feature flag data.");
  }

  const environment = await prisma.environment.findFirst({
    where: {
      id: parsedInput.data.environmentId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!environment) {
    return jsonError(404, "ENVIRONMENT_NOT_FOUND", "Environment not found.");
  }

  try {
    const created = await prisma.featureFlag.create({
      data: {
        tenantId: membership.tenantId,
        createdByUserId: membership.userId,
        updatedByUserId: membership.userId,
        ...parsedInput.data,
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

    const payload = upsertFeatureFlagResponseSchema.parse({
      success: true,
      item: {
        ...created,
        environmentKey: created.environment.key,
        environmentName: created.environment.name,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(
        409,
        "FLAG_KEY_ALREADY_EXISTS",
        "A flag with this key already exists.",
      );
    }

    return jsonError(500, "INTERNAL_ERROR", "Could not create feature flag.");
  }
}
