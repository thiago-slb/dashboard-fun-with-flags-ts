import { NextResponse } from "next/server";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { getActiveTenantIdCookie, setActiveTenantCookie } from "@/lib/auth/active-tenant";
import {
  createProjectInputSchema,
  listProjectsResponseSchema,
  projectErrorResponseSchema,
  upsertProjectResponseSchema,
} from "@/lib/projects/schemas";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = projectErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, { status });
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
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const queryParam = url.searchParams.get("q")?.trim() ?? "";
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  const hasPagination = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const limit = hasPagination ? Math.min(parsedLimit, 50) : null;
  const cursor = cursorParam?.trim() || null;
  const hasSearch = queryParam.length > 0;

  const membershipWhere = {
    userId: session.userId,
    ...(hasPagination && cursor ? { id: { gt: cursor } } : {}),
    ...(hasSearch
      ? {
          tenant: {
            OR: [
              { name: { contains: queryParam, mode: "insensitive" } },
              { slug: { contains: queryParam, mode: "insensitive" } },
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

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = createProjectInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid project data.");
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const baseSlug = slugify(parsedInput.data.name) || "project";
  const slug = `${baseSlug}-${randomSuffix}`;

  const created = await prisma.$transaction(async (tx) => {
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

    await tx.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: "Desenvolvimento",
        description: "Ambiente de desenvolvimento padrão.",
        createdByUserId: session.userId,
      },
    });

    return tenant;
  });

  await setActiveTenantCookie(created.id);

  const payload = upsertProjectResponseSchema.parse({
    success: true,
    item: projectToItem(created, created.id),
  });

  return NextResponse.json(payload, { status: 201 });
}
