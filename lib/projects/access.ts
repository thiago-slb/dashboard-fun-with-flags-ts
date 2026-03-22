import { MembershipStatus } from "@prisma/client";
import { hasProjectAccess } from "@/lib/projects/access-rules";
import { prisma } from "@/lib/prisma";
export { hasProjectAccess };

export async function getUserProjectAccessInTenant(userId: string, tenantId: string) {
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

export async function canUserCreateProjects(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
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
    take: 20,
  });

  for (const membership of memberships) {
    const roleNames = membership.roles.map((entry) => entry.role.name);
    const permissions = membership.roles.flatMap((entry) =>
      entry.role.permissions.map((rolePermission) => ({
        resource: rolePermission.permission.resource,
        action: rolePermission.permission.action,
      })),
    );
    if (hasProjectAccess("write", roleNames, permissions)) {
      return true;
    }
  }

  return false;
}
