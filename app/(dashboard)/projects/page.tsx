import { redirect } from "next/navigation";
import { ProjectsPageClient } from "./ProjectsPageClient";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
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

  return <ProjectsPageClient userName={userName} userEmail={userEmail} />;
}
