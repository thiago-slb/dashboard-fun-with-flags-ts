import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import {
  experimentAssignInputSchema,
  experimentAssignResponseSchema,
  experimentErrorResponseSchema,
} from "@/lib/experiments/schemas";
import {
  chooseVariant,
  isExperimentContextAllowed,
  normalizeCountry,
  refreshExperimentStatusIfNeeded,
} from "@/lib/experiments/service";
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
      return jsonError(403, "FORBIDDEN", "This API key does not allow reading experiments.", requestId);
    }
    return jsonError(401, "INVALID_API_KEY", "Invalid API key.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.", requestId);
  }

  const parsedInput = experimentAssignInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid assignment data.", requestId);
  }

  const input = parsedInput.data;
  const experiment = await prisma.experiment.findFirst({
    where: {
      tenantId: auth.tenantId,
      environmentId: auth.environmentId,
      key: input.experimentKey,
      deletedAt: null,
    },
    include: {
      variants: {
        select: {
          id: true,
          key: true,
          name: true,
          trafficPercent: true,
          isControl: true,
        },
      },
    },
  });
  if (!experiment) {
    return jsonError(404, "NOT_FOUND", "Experiment not found.", requestId);
  }

  const status = await refreshExperimentStatusIfNeeded(prisma, experiment);
  if (status !== "RUNNING") {
    return jsonError(409, "EXPERIMENT_NOT_RUNNING", "Experiment is not running.", requestId);
  }

  if (
    !isExperimentContextAllowed(experiment, {
      featureKey: input.featureKey,
      pagePath: input.pagePath,
      country: input.country,
      device: input.device,
    })
  ) {
    return jsonError(403, "SEGMENT_MISMATCH", "Context does not match experiment segment.", requestId);
  }

  const existingAssignment =
    experiment.stickyBucketing
      ? await prisma.experimentAssignment.findFirst({
          where: {
            experimentId: experiment.id,
            userKey: input.userKey,
          },
          include: {
            variant: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        })
      : null;

  const variant =
    existingAssignment?.variant ??
    (await chooseVariant(experiment, input.userKey));

  if (!variant) {
    return jsonError(409, "NO_VARIANTS", "No eligible variant found.", requestId);
  }

  const assignment = existingAssignment
    ? existingAssignment
    : await prisma.experimentAssignment.create({
        data: {
          tenantId: auth.tenantId,
          experimentId: experiment.id,
          variantId: variant.id,
          userKey: input.userKey,
        },
      });

  await prisma.experimentEvent.create({
    data: {
      tenantId: auth.tenantId,
      experimentId: experiment.id,
      variantId: variant.id,
      userKey: input.userKey,
      eventName: "exposure",
      country: normalizeCountry(input.country),
      device: input.device ?? "ANY",
      pagePath: input.pagePath?.trim() || null,
      featureKey: input.featureKey?.trim().toLowerCase() || null,
    },
  });

  const payload = experimentAssignResponseSchema.parse({
    success: true,
    experimentId: experiment.id,
    experimentKey: experiment.key,
    variantKey: variant.key,
    variantName: variant.name,
    assignmentId: assignment.id,
  });

  logApiEvent({
    requestId,
    route: "/api/sdk/experiments/assign",
    level: "info",
    message: "Experiment assignment resolved.",
    extra: {
      experimentId: experiment.id,
      variantId: variant.id,
      tenantId: auth.tenantId,
    },
  });

  return NextResponse.json(payload, {
    headers: mergeHeaders({ "x-request-id": requestId }, buildNoStoreHeaders()),
  });
}
