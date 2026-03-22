import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import {
  apiKeyErrorResponseSchema,
  createApiKeyInputSchema,
  createApiKeyResponseSchema,
  listApiKeysResponseSchema,
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
  canWriteFeatureFlags: boolean;
  canReadEnvironments: boolean;
  canWriteEnvironments: boolean;
  canReadProjects: boolean;
  canWriteProjects: boolean;
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
    canWriteFeatureFlags: apiKey.canWriteFeatureFlags,
    canReadEnvironments: apiKey.canReadEnvironments,
    canWriteEnvironments: apiKey.canWriteEnvironments,
    canReadProjects: apiKey.canReadProjects,
    canWriteProjects: apiKey.canWriteProjects,
    enabled: apiKey.enabled,
    lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function generateApiKey() {
  return `fwf_${randomBytes(24).toString("base64url")}`;
}

export async function GET() {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: { createdAt: "desc" },
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
      canWriteFeatureFlags: true,
      canReadEnvironments: true,
      canWriteEnvironments: true,
      canReadProjects: true,
      canWriteProjects: true,
      enabled: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const payload = listApiKeysResponseSchema.parse({
    success: true,
    items: apiKeys.map(toItem),
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

  const parsedInput = createApiKeyInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid API key data.");
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

  const rawApiKey = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      tenantId: membership.tenantId,
      createdByUserId: membership.userId,
      environmentId: parsedInput.data.environmentId,
      name: parsedInput.data.name,
      keyPrefix: rawApiKey.slice(0, 14),
      secretHash: hashApiKey(rawApiKey),
      canReadFeatureFlags: parsedInput.data.canReadFeatureFlags,
      canWriteFeatureFlags:
        parsedInput.data.canWriteFeatureFlags && parsedInput.data.canReadFeatureFlags,
      canReadEnvironments: parsedInput.data.canReadEnvironments,
      canWriteEnvironments:
        parsedInput.data.canWriteEnvironments && parsedInput.data.canReadEnvironments,
      canReadProjects: parsedInput.data.canReadProjects,
      canWriteProjects:
        parsedInput.data.canWriteProjects && parsedInput.data.canReadProjects,
      enabled: parsedInput.data.enabled,
    },
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
      canWriteFeatureFlags: true,
      canReadEnvironments: true,
      canWriteEnvironments: true,
      canReadProjects: true,
      canWriteProjects: true,
      enabled: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const payload = createApiKeyResponseSchema.parse({
    success: true,
    item: toItem(created),
    apiKey: rawApiKey,
  });

  return NextResponse.json(payload, { status: 201 });
}
