import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import {
  experimentErrorResponseSchema,
  experimentTrackEventInputSchema,
  experimentTrackEventResponseSchema,
} from "@/lib/experiments/schemas";
import { normalizeCountry } from "@/lib/experiments/service";
import { createRequestId, logApiEvent } from "@/lib/http/request-context";
import { buildNoStoreHeaders, mergeHeaders } from "@/lib/http/response-headers";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string, requestId: string) {
  const payload = experimentErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });
  return NextResponse.json(payload, {
    status,
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders()),
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const auth = await authenticateApiKey(request, "feature_flags:read");
  if (!auth.ok) {
    if (auth.code === "MISSING_KEY") {
      return jsonError(401, "MISSING_API_KEY", "API key is required.", requestId);
    }
    if (auth.code === "FORBIDDEN") {
      return jsonError(403, "FORBIDDEN", "This API key does not allow tracking experiment events.", requestId);
    }
    return jsonError(401, "INVALID_API_KEY", "Invalid API key.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = experimentTrackEventInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid tracking event payload.", requestId);
  }

  const input = parsedInput.data;
  const experiment = await prisma.experiment.findFirst({
    where: {
      tenantId: auth.tenantId,
      environmentId: auth.environmentId,
      key: input.experimentKey,
      deletedAt: null,
    },
    select: {
      id: true,
      key: true,
      variants: {
        select: {
          id: true,
          key: true,
        },
      },
    },
  });
  if (!experiment) {
    return jsonError(404, "NOT_FOUND", "Experiment not found.", requestId);
  }

  const variantId = input.variantKey
    ? experiment.variants.find((variant) => variant.key === input.variantKey)?.id ?? null
    : null;

  const event = await prisma.experimentEvent.create({
    data: {
      tenantId: auth.tenantId,
      experimentId: experiment.id,
      variantId,
      userKey: input.userKey?.trim() || null,
      eventName: input.eventName,
      pagePath: input.pagePath?.trim() || null,
      featureKey: input.featureKey?.trim().toLowerCase() || null,
      country: normalizeCountry(input.country),
      device: input.device ?? "ANY",
      revenue: input.revenue ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    select: { id: true },
  });

  const payload = experimentTrackEventResponseSchema.parse({
    success: true,
    id: event.id,
  });

  logApiEvent({
    requestId,
    route: "/api/sdk/experiments/events",
    level: "info",
    message: "Experiment event tracked.",
    extra: {
      experimentId: experiment.id,
      eventName: input.eventName,
    },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders()),
  });
}
