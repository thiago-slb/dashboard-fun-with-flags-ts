import { ActionLogType, MembershipStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { ensureTenantDefaultPermissions } from "@/lib/auth/permissions";
import { getActiveTenantIdCookie, setActiveTenantCookie } from "@/lib/auth/active-tenant";
import { logAction } from "@/lib/audit/action-log";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { canUserCreateProjects } from "@/lib/projects/access";
import {
  createProjectInputSchema,
  listProjectsResponseSchema,
  projectErrorResponseSchema,
  upsertProjectResponseSchema,
} from "@/lib/projects/schemas";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/auth/session";
import {
  DEVELOPMENT_ENVIRONMENT_DESCRIPTION_BY_LOCALE,
  DEVELOPMENT_ENVIRONMENT_NAME_BY_LOCALE,
  resolveLocaleFromAcceptLanguage,
} from "@/lib/environments/default-development";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string, requestId: string) {
  const payload = projectErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, {
    status,
    headers: { "x-request-id": requestId },
  });
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function projectToItem(
  tenant: { id: string; name: string; slug: string; createdAt: Date; updatedAt: Date },
  activeTenantId: string | null,
) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    isActive: tenant.id === activeTenantId,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(`projects:get:${session.userId}`, 80, 60_000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  if (limitParam && (!Number.isFinite(parsedLimit) || parsedLimit < 1)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid limit.", requestId);
  }
  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;

  const membershipWhere = {
    userId: session.userId,
    status: MembershipStatus.ACTIVE,
    ...(hasPagination && cursor ? { id: { gt: cursor } } : {}),
    ...(hasSearch
      ? {
          tenant: {
            OR: [
              { name: { contains: queryParam } },
              { slug: { contains: queryParam } },
            ],
          },
        }
      : {}),
  };

  const firstMembership = await prisma.membership.findFirst({
    where: membershipWhere,
    orderBy: [{ id: "asc" }],
    select: { tenantId: true },
  });

  const memberships = await prisma.membership.findMany({
    where: membershipWhere,
    orderBy: [{ id: "asc" }],
    take: hasPagination && limit ? limit + 1 : undefined,
    select: {
      id: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const pageItems = hasPagination && limit ? memberships.slice(0, limit) : memberships;
  const nextCursor =
    hasPagination && limit && memberships.length > limit
      ? memberships[limit - 1]?.id ?? null
      : null;

  const activeTenantId = await getActiveTenantIdCookie();
  const fallbackTenantId = firstMembership?.tenantId ?? null;
  const resolvedActiveTenantId = pageItems.some(
    (membership) => membership.tenant.id === activeTenantId,
  )
    ? activeTenantId
    : fallbackTenantId;

  const payload = listProjectsResponseSchema.parse({
    success: true,
    items: pageItems.map((membership) =>
      projectToItem(membership.tenant, resolvedActiveTenantId),
    ),
    nextCursor,
  });

  logApiEvent({
    requestId,
    route: "/api/projects",
    userId: session.userId,
    level: "info",
    message: "Projects listed.",
    extra: { itemCount: payload.items.length, hasSearch, hasPagination },
  });

  return NextResponse.json(payload, {
    headers: { "x-request-id": requestId },
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(`projects:create:${session.userId}`, 12, 60_000);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  const canCreate = await canUserCreateProjects(session.userId);
  if (!canCreate) {
    return jsonError(403, "FORBIDDEN", "You do not have permission to create projects.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = createProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.", requestId);
  }
  const locale = resolveLocaleFromAcceptLanguage(
    request.headers.get("accept-language"),
  );

  const baseSlug = slugify(parsedInput.data.name) || "project";

  let created:
    | { id: string; name: string; slug: string; createdAt: Date; updatedAt: Date }
    | null = null;
  let attempt = 0;
  const maxAttempts = 3;

  while (!created && attempt < maxAttempts) {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const slug = `${baseSlug}-${randomSuffix}`;
    attempt += 1;

    try {
      created = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: parsedInput.data.name,
            slug,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: MASTER_ROLE_NAME,
            description: "Master role with full access.",
            isSystem: true,
          },
          select: { id: true },
        });

        const membership = await tx.membership.create({
          data: {
            userId: session.userId,
            tenantId: tenant.id,
          },
          select: { id: true },
        });

        await tx.membershipRole.create({
          data: {
            membershipId: membership.id,
            roleId: role.id,
          },
        });

        await ensureTenantDefaultPermissions(tx, tenant.id, role.id);

        await tx.environment.create({
          data: {
            tenantId: tenant.id,
            key: "development",
            name: DEVELOPMENT_ENVIRONMENT_NAME_BY_LOCALE[locale],
            description: DEVELOPMENT_ENVIRONMENT_DESCRIPTION_BY_LOCALE[locale],
            createdByUserId: session.userId,
          },
        });

        await logAction({
          tx,
          tenantId: tenant.id,
          userId: session.userId,
          actionType: ActionLogType.CREATE,
          resource: "project",
          resourceId: tenant.id,
          details: {
            name: tenant.name,
            slug: tenant.slug,
          },
        });

        return tenant;
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < maxAttempts) {
        continue;
      }

      if (isUniqueConstraintError(error)) {
        return jsonError(
          409,
          "PROJECT_ALREADY_EXISTS",
          "Could not generate a unique project slug. Please try again.",
          requestId,
        );
      }

      logApiEvent({
        requestId,
        route: "/api/projects",
        userId: session.userId,
        level: "error",
        message: "Could not create project.",
      });
      return jsonError(500, "INTERNAL_ERROR", "Could not create project.", requestId);
    }
  }

  if (!created) {
    return jsonError(500, "INTERNAL_ERROR", "Could not create project.", requestId);
  }

  await setActiveTenantCookie(created.id);

  const payload = upsertProjectResponseSchema.parse({
    success: true,
    item: projectToItem(created, created.id),
  });

  logApiEvent({
    requestId,
    route: "/api/projects",
    userId: session.userId,
    level: "info",
    message: "Project created.",
    extra: { projectId: created.id },
  });

  return NextResponse.json(payload, {
    status: 201,
    headers: { "x-request-id": requestId },
  });
}
