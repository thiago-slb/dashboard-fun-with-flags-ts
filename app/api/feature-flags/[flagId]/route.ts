import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  deleteFeatureFlagResponseSchema,
  featureFlagErrorResponseSchema,
  updateFeatureFlagInputSchema,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ flagId: string }> },
) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { flagId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = updateFeatureFlagInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid feature flag data.");
  }

  if (parsedInput.data.environmentId) {
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
  }

  const existing = await prisma.featureFlag.findFirst({
    where: {
      id: flagId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Feature flag not found.");
  }

  try {
    const updatePayload = {
      ...parsedInput.data,
      ...(parsedInput.data.allowListEmails !== undefined
        ? { allowListEmails: normalizeAllowListEmails(parsedInput.data.allowListEmails) }
        : {}),
    };

    const updated = await prisma.featureFlag.update({
      where: { id: flagId },
      data: {
        ...updatePayload,
        updatedByUserId: membership.userId,
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
        ...updated,
        allowListEmails: normalizeAllowListEmails(updated.allowListEmails),
        environmentKey: updated.environment.key,
        environmentName: updated.environment.name,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    return NextResponse.json(payload);
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

    return jsonError(500, "INTERNAL_ERROR", "Could not update feature flag.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ flagId: string }> },
) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { flagId } = await params;

  const existing = await prisma.featureFlag.findFirst({
    where: {
      id: flagId,
      tenantId: membership.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Feature flag not found.");
  }

  await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      deletedAt: new Date(),
      enabled: false,
    },
  });

  const payload = deleteFeatureFlagResponseSchema.parse({
    success: true,
    id: flagId,
  });

  return NextResponse.json(payload);
}
