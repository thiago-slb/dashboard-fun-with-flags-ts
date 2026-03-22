import { ActionLogType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogActionParams = {
  tenantId: string;
  userId?: string | null;
  actionType: ActionLogType;
  resource: string;
  resourceId?: string | null;
  details?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
};

export async function logAction(params: LogActionParams) {
  const client = params.tx ?? prisma;

  await client.actionLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      actionType: params.actionType,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      details: params.details,
    },
  });
}
