import { MembershipStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { getActiveTenantIdCookie } from "@/lib/auth/active-tenant";
import { prisma } from "@/lib/prisma";

export async function getCurrentMembershipContext() {
  const session = await getSession();

  if (!session) {
    return null;
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
          userId: true,
          tenantId: true,
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
        userId: true,
        tenantId: true,
      },
    });
  }

  if (!membership) {
    return null;
  }

  return membership;
}
