import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getCurrentMembershipContext() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      userId: true,
      tenantId: true,
    },
  });

  if (!membership) {
    return null;
  }

  return membership;
}
