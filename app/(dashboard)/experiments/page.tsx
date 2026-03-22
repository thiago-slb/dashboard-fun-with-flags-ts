import { redirect } from "next/navigation";
import { ExperimentsPageClient } from "./ExperimentsPageClient";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { getSession } from "@/lib/auth/session";
import { getUserExperimentAccessInTenant, hasExperimentAccess } from "@/lib/experiments/access";
import { prisma } from "@/lib/prisma";

export default async function ExperimentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/signin");
  }

  const membership = await getCurrentMembershipContext();
  if (!membership) {
    redirect("/signin");
  }

  const access = await getUserExperimentAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasExperimentAccess("read", access.roleNames, access.permissions)) {
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

  return <ExperimentsPageClient userName={userName} userEmail={userEmail} />;
}
