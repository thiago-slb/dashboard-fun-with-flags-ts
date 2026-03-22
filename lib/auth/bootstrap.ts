import { prisma } from "@/lib/prisma";

const MAX_LEVEL_ROLE = "MAX_LEVEL_ROLE";

export async function existsUserWithMaxLevelRole() {
  const match = await prisma.membershipRole.findFirst({
    where: {
      role: {
        name: MAX_LEVEL_ROLE,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(match);
}
