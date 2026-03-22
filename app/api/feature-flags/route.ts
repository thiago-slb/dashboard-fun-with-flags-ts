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

export async function GET(request: Request) {
  const membership = await getCurrentMembershipContext();
  if (!membership) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  if (limitParam && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid limit.");
  }
  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;

  const items = await prisma.featureFlag.findMany({
    where: {
      tenantId: membership.tenantId,
      deletedAt: null,
      ...(hasPagination && cursor ? { id: { gt: cursor } } : {}),
      ...(hasSearch
        ? {
            OR: [
              { key: { contains: queryParam } },
              { name: { contains: queryParam } },
              { description: { contains: queryParam } },
              { environment: { key: { contains: queryParam } } },
              { environment: { name: { contains: queryParam } } },
            ],
          }
        : {}),
    },
    include: {
      environment: {
        select: {
          key: true,
          name: true,
        },
      },
    },
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
  });
  const pageItems = hasPagination && limit ? items.slice(0, limit) : items;
  const nextCursor =
    hasPagination && limit && items.length > limit ? items[limit - 1]?.id ?? null : null;

  const payload = listFeatureFlagsResponseSchema.parse({
    success: true,
    items: pageItems.map((item) => ({
      ...item,
      allowListEmails: normalizeAllowListEmails(item.allowListEmails),
      environmentKey: item.environment.key,
      environmentName: item.environment.name,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
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
        allowListEmails: normalizeAllowListEmails(parsedInput.data.allowListEmails),
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
        allowListEmails: normalizeAllowListEmails(created.allowListEmails),
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
