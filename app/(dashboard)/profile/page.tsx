import { redirect } from "next/navigation";
import { ProfilePageClient } from "./ProfilePageClient";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          status: true,
          tenant: {
            select: {
              name: true,
            },
          },
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/signin");
  }

  const firstMembership = user.memberships[0];
  const firstRoleName = firstMembership?.roles[0]?.role.name ?? "NO_ROLE";

  return (
    <ProfilePageClient
      userName={user.name?.trim() ? user.name : user.email.split("@")[0]}
      userEmail={user.email}
      userId={user.id}
      primaryRole={firstRoleName}
      workspaceName={firstMembership?.tenant.name ?? "NO_WORKSPACE"}
      membershipStatus={firstMembership?.status ?? "UNKNOWN"}
    />
  );
}
