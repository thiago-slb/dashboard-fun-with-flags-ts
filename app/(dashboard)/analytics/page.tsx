import { redirect } from "next/navigation";
import { AnalyticsPageClient } from "./AnalyticsPageClient";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { getSession } from "@/lib/auth/session";
import { getUserExperimentAccessInTenant, hasAnalyticsAccess } from "@/lib/experiments/access";
import { prisma } from "@/lib/prisma";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/signin");
  }

  const membership = await getCurrentMembershipContext();
  if (!membership) {
    redirect("/signin");
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasAnalyticsAccess(access.roleNames, access.permissions)) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
    },
  });

  const userEmail = user?.email ?? session.email;
  const userName = user?.name?.trim() ? user.name : userEmail.split("@")[0];

  return <AnalyticsPageClient userName={userName} userEmail={userEmail} />;
}
