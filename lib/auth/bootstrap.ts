import { prisma } from "@/lib/prisma";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";

export async function existsUserWithMaxLevelRole() {
  const match = await prisma.membershipRole.findFirst({
    where: {
      role: {
        name: MASTER_ROLE_NAME,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(match);
}
