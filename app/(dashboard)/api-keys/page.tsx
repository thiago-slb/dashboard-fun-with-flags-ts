import { redirect } from "next/navigation";
import { ApiKeysPageClient } from "./ApiKeysPageClient";
import { getCurrentMembershipContext } from "@/lib/auth/current-membership";
import { getUserApiKeyAccessInTenant, hasApiKeyAccess } from "@/lib/api-keys/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session) {
    redirect("/signin");
  }

  const membership = await getCurrentMembershipContext();
  if (!membership) {
    redirect("/signin");
  }

  const access = await getUserApiKeyAccessInTenant(membership.userId, membership.tenantId);
  if (!access || !hasApiKeyAccess("read", access.roleNames, access.permissions)) {
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

  return <ApiKeysPageClient userName={userName} userEmail={userEmail} />;
}
