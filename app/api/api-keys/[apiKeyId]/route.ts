import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  apiKeyErrorResponseSchema,
  deleteApiKeyResponseSchema,
  updateApiKeyInputSchema,
  upsertApiKeyResponseSchema,
} from "@/lib/api-keys/schemas";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = apiKeyErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, { status });
}

function toItem(apiKey: {
  id: string;
  environmentId: string;
  environment: {
    key: string;
    name: string;
  };
  name: string;
  keyPrefix: string;
  canReadFeatureFlags: boolean;
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: apiKey.id,
    environmentId: apiKey.environmentId,
    environmentKey: apiKey.environment.key,
    environmentName: apiKey.environment.name,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    canReadFeatureFlags: apiKey.canReadFeatureFlags,
    enabled: apiKey.enabled,
    lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { apiKeyId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = updateApiKeyInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid API key data.");
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

  const existing = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "API key not found.");
  }

  const updated = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: parsedInput.data,
    select: {
      id: true,
      environmentId: true,
      environment: {
        select: {
          key: true,
          name: true,
        },
      },
      name: true,
      keyPrefix: true,
      canReadFeatureFlags: true,
      enabled: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const payload = upsertApiKeyResponseSchema.parse({
    success: true,
    item: toItem(updated),
  });

  return NextResponse.json(payload);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const { apiKeyId } = await params;

  const existing = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "API key not found.");
  }

  await prisma.apiKey.delete({
    where: { id: apiKeyId },
  });

  const payload = deleteApiKeyResponseSchema.parse({
    success: true,
    id: apiKeyId,
  });

  return NextResponse.json(payload);
}
