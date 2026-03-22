import { prisma } from "@/lib/prisma";
import { getApiKeyLookupHashes, verifyApiKeySecret } from "@/lib/api-keys/crypto";

export type ApiKeyPermission =
  | "feature_flags:read"
  | "feature_flags:write"
  | "environments:read"
  | "environments:write"
  | "projects:read"
  | "projects:write";

export type ApiKeyAuthResult =
  | {
      ok: true;
      apiKeyId: string;
      tenantId: string;
      environmentId: string;
      keyPrefix: string;
      canReadFeatureFlags: boolean;
      canWriteFeatureFlags: boolean;
      canReadEnvironments: boolean;
      canWriteEnvironments: boolean;
      canReadProjects: boolean;
      canWriteProjects: boolean;
    }
  | { ok: false; code: "MISSING_KEY" | "INVALID_KEY" | "FORBIDDEN" };

function getApiKeyFromRequest(request: Request) {
  const fromHeader = request.headers.get("x-api-key")?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const auth = request.headers.get("authorization")?.trim();
  if (!auth) {
    return null;
  }

  const [scheme, token] = auth.split(/\s+/, 2);
  if (scheme?.toLowerCase() === "bearer" && token) {
    return token.trim();
  }

  return null;
}

function hasPermission(result: Exclude<ApiKeyAuthResult, { ok: false }>, permission: ApiKeyPermission) {
  switch (permission) {
    case "feature_flags:read":
      return result.canReadFeatureFlags || result.canWriteFeatureFlags;
    case "feature_flags:write":
      return result.canWriteFeatureFlags;
    case "environments:read":
      return result.canReadEnvironments || result.canWriteEnvironments;
    case "environments:write":
      return result.canWriteEnvironments;
    case "projects:read":
      return result.canReadProjects || result.canWriteProjects;
    case "projects:write":
      return result.canWriteProjects;
    default:
      return false;
  }
}

export async function authenticateApiKey(
  request: Request,
  requiredPermission?: ApiKeyPermission,
): Promise<ApiKeyAuthResult> {
  const rawApiKey = getApiKeyFromRequest(request);
  if (!rawApiKey) {
    return { ok: false, code: "MISSING_KEY" };
  }

  const lookupHashes = getApiKeyLookupHashes(rawApiKey);
  const candidate = await prisma.apiKey.findFirst({
    where: {
      secretHash: { in: lookupHashes },
      deletedAt: null,
      enabled: true,
      environment: {
        enabled: true,
      },
    },
    select: {
      id: true,
      tenantId: true,
      environmentId: true,
      keyPrefix: true,
      secretHash: true,
      canReadFeatureFlags: true,
      canWriteFeatureFlags: true,
      canReadEnvironments: true,
      canWriteEnvironments: true,
      canReadProjects: true,
      canWriteProjects: true,
    },
  });

  if (!candidate || !verifyApiKeySecret(rawApiKey, candidate.secretHash)) {
    return { ok: false, code: "INVALID_KEY" };
  }

  const result: Exclude<ApiKeyAuthResult, { ok: false }> = {
    ok: true,
    apiKeyId: candidate.id,
    tenantId: candidate.tenantId,
    environmentId: candidate.environmentId,
    keyPrefix: candidate.keyPrefix,
    canReadFeatureFlags: candidate.canReadFeatureFlags,
    canWriteFeatureFlags: candidate.canWriteFeatureFlags,
    canReadEnvironments: candidate.canReadEnvironments,
    canWriteEnvironments: candidate.canWriteEnvironments,
    canReadProjects: candidate.canReadProjects,
    canWriteProjects: candidate.canWriteProjects,
  };

  if (requiredPermission && !hasPermission(result, requiredPermission)) {
    return { ok: false, code: "FORBIDDEN" };
  }

  await prisma.apiKey.update({
    where: { id: candidate.id },
    data: { lastUsedAt: new Date() },
    select: { id: true },
  });

  return result;
}
