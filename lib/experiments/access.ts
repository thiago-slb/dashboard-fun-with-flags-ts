import { MembershipStatus } from "@prisma/client";
import { hasAnalyticsAccess, hasExperimentAccess } from "@/lib/experiments/access-rules";
import { prisma } from "@/lib/prisma";

export { hasExperimentAccess, hasAnalyticsAccess };

export async function getUserExperimentAccessInTenant(userId: string, tenantId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      id: true,
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

  if (!membership) {
    return null;
  }

  const roleNames = membership.roles.map((entry) => entry.role.name);
  const permissions = membership.roles.flatMap((entry) =>
    entry.role.permissions.map((rolePermission) => ({
      resource: rolePermission.permission.resource,
      action: rolePermission.permission.action,
    })),
  );

  return {
    membershipId: membership.id,
    roleNames,
    permissions,
  };
}
