import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { listFeatureFlagsResponseSchema } from "@/lib/feature-flags/schemas";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { buildNoStoreHeaders, mergeHeaders } from "@/lib/http/response-headers";
import { prisma } from "@/lib/prisma";

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

function jsonError(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    {
      status,
      headers: mergeHeaders(
        { "x-request-id": requestId },
        buildNoStoreHeaders(),
      ),
    },
  );
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const auth = await authenticateApiKey(request, "feature_flags:read");
  if (!auth.ok) {
    if (auth.code === "MISSING_KEY") {
      return jsonError(401, "MISSING_API_KEY", "API key is required.", requestId);
    }
    if (auth.code === "FORBIDDEN") {
      return jsonError(
        403,
        "FORBIDDEN",
        "This API key does not allow reading feature flags.",
        requestId,
      );
    }
    return jsonError(401, "INVALID_API_KEY", "Invalid API key.", requestId);
  }

  const items = await prisma.featureFlag.findMany({
    where: {
      tenantId: auth.tenantId,
      environmentId: auth.environmentId,
      deletedAt: null,
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
      allowListEmails: normalizeAllowListEmails(item.allowListEmails),
      environmentKey: item.environment.key,
      environmentName: item.environment.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });

  logApiEvent({
    requestId,
    route: "/api/sdk/feature-flags",
    level: "info",
    message: "Feature flags listed using API key.",
    extra: {
      apiKeyId: auth.apiKeyId,
      tenantId: auth.tenantId,
      environmentId: auth.environmentId,
      count: payload.items.length,
    },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders(
      { "x-request-id": requestId },
      buildNoStoreHeaders(),
    ),
  });
}
