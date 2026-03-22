import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getActiveTenantIdCookie } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { resolveMenuItems } from "@/lib/navigation/menu";
import {
  navigationMenuErrorResponseSchema,
  navigationMenuResponseSchema,
} from "@/lib/navigation/schemas";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";

function jsonError(status: number, code: string, message: string, requestId: string) {
  const payload = navigationMenuErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, {
    status,
    headers: { "x-request-id": requestId },
  });
}

export async function GET() {
  const requestId = createRequestId();
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.", requestId);
  }

  const rateLimit = consumeRateLimit(
    `navigation:menu:${session.userId}`,
    120,
    60_000,
  );
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ${rateLimit.retryAfterSeconds}s.`,
      requestId,
    );
  }

  const activeTenantId = await getActiveTenantIdCookie();
  let membership = activeTenantId
    ? await prisma.membership.findFirst({
        where: {
          userId: session.userId,
          tenantId: activeTenantId,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          resource: true,
                          action: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        status: MembershipStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        resource: true,
                        action: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  if (!membership) {
    return jsonError(403, "FORBIDDEN", "Membership is not active.", requestId);
  }

  const roleNames = membership.roles.map((entry) => entry.role.name);
  const permissions = membership.roles.flatMap((entry) =>
    entry.role.permissions.map((rolePermission) => ({
      resource: rolePermission.permission.resource,
      action: rolePermission.permission.action,
    })),
  );

  const payload = navigationMenuResponseSchema.parse({
    success: true,
    items: resolveMenuItems(roleNames, permissions),
  });

  logApiEvent({
    requestId,
    route: "/api/navigation/menu",
    userId: session.userId,
    level: "info",
    message: "Navigation menu resolved.",
    extra: { itemCount: payload.items.length },
  });

  return NextResponse.json(payload, {
    headers: { "x-request-id": requestId },
  });
}
