import { redirect } from "next/navigation";
import { EnvironmentsPageClient } from "./EnvironmentsPageClient";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function EnvironmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/signin");
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

  return <EnvironmentsPageClient userName={userName} userEmail={userEmail} />;
}
