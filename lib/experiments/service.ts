import { ExperimentAllocationMode, ExperimentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ExperimentWithVariants = {
  id: string;
  key: string;
  status: ExperimentStatus;
  allocationMode: ExperimentAllocationMode;
  targetType: "USER" | "FEATURE" | "PAGE";
  targetValue: string | null;
  segmentCountry: string | null;
  segmentDevice: "ANY" | "MOBILE" | "DESKTOP" | "TABLET";
  stickyBucketing: boolean;
  gradualRolloutEnabled: boolean;
  rolloutPercent: number;
  autoStart: boolean;
  autoStop: boolean;
  startAt: Date | null;
  endAt: Date | null;
  goalEventName: string;
  guardrailMaxErrorRate: number | null;
  guardrailMinRevenue: number | null;
  variants: Array<{
    id: string;
    key: string;
    name: string;
    trafficPercent: number;
    isControl: boolean;
  }>;
};

export function normalizeCountry(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function isExperimentContextAllowed(
  experiment: Pick<ExperimentWithVariants, "targetType" | "targetValue" | "segmentCountry" | "segmentDevice">,
  context: {
    featureKey?: string;
    pagePath?: string;
    country?: string;
    device?: "ANY" | "MOBILE" | "DESKTOP" | "TABLET";
  },
) {
  const normalizedCountry = normalizeCountry(context.country);
  if (experiment.segmentCountry && normalizeCountry(experiment.segmentCountry) !== normalizedCountry) {
    return false;
  }

  if (experiment.segmentDevice !== "ANY" && context.device && experiment.segmentDevice !== context.device) {
    return false;
  }

  if (experiment.targetType === "FEATURE" && experiment.targetValue) {
    return context.featureKey?.trim().toLowerCase() === experiment.targetValue.trim().toLowerCase();
  }

  if (experiment.targetType === "PAGE" && experiment.targetValue) {
    return context.pagePath?.trim() === experiment.targetValue.trim();
  }

  return true;
}

export async function refreshExperimentStatusIfNeeded(
  tx: Prisma.TransactionClient | typeof prisma,
  experiment: Pick<ExperimentWithVariants, "id" | "status" | "autoStart" | "autoStop" | "startAt" | "endAt">,
) {
  const now = new Date();
  let nextStatus = experiment.status;

  if (
    experiment.autoStart &&
    experiment.status === "DRAFT" &&
    experiment.startAt &&
    now >= experiment.startAt
  ) {
    nextStatus = "RUNNING";
  }

  if (
    experiment.autoStop &&
    experiment.status === "RUNNING" &&
    experiment.endAt &&
    now >= experiment.endAt
  ) {
    nextStatus = "COMPLETED";
  }

  if (nextStatus !== experiment.status) {
    const updated = await tx.experiment.update({
      where: { id: experiment.id },
      data: { status: nextStatus },
      select: { status: true },
    });
    return updated.status;
  }

  return experiment.status;
}

function weightedPick(items: Array<{ id: string; trafficPercent: number }>) {
  const total = items.reduce((acc, item) => acc + item.trafficPercent, 0);
  if (total <= 0) {
    return items[0]?.id ?? null;
  }
  let threshold = Math.random() * total;
  for (const item of items) {
    threshold -= item.trafficPercent;
    if (threshold <= 0) {
      return item.id;
    }
  }
  return items[items.length - 1]?.id ?? null;
}

async function pickWithBandit(experimentId: string, variants: ExperimentWithVariants["variants"], goalEventName: string) {
  const scores = await Promise.all(
    variants.map(async (variant) => {
      const [exposures, conversions] = await Promise.all([
        prisma.experimentEvent.count({
          where: {
            experimentId,
            variantId: variant.id,
            eventName: "exposure",
          },
        }),
        prisma.experimentEvent.count({
          where: {
            experimentId,
            variantId: variant.id,
            eventName: goalEventName,
          },
        }),
      ]);

      const conversionRate = (conversions + 1) / (exposures + 2);
      return {
        variantId: variant.id,
        score: conversionRate + Math.random() * 0.02,
      };
    }),
  );

  const explore = Math.random() < 0.2;
  if (explore) {
    const randomIndex = Math.floor(Math.random() * variants.length);
    return variants[randomIndex]?.id ?? null;
  }

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.variantId ?? null;
}

export async function chooseVariant(
  experiment: ExperimentWithVariants,
  userKey: string,
) {
  const eligibleVariants = experiment.variants.filter((variant) => variant.trafficPercent > 0);
  if (eligibleVariants.length === 0) {
    return null;
  }

  if (experiment.gradualRolloutEnabled && experiment.rolloutPercent < 100) {
    const rolloutHash = hashStringToPercent(`${experiment.id}:${userKey}`);
    if (rolloutHash > experiment.rolloutPercent) {
      const control = eligibleVariants.find((item) => item.isControl) ?? eligibleVariants[0];
      return control ?? null;
    }
  }

  if (experiment.allocationMode === "BANDIT") {
    const banditChoice = await pickWithBandit(experiment.id, eligibleVariants, experiment.goalEventName);
    return eligibleVariants.find((variant) => variant.id === banditChoice) ?? eligibleVariants[0] ?? null;
  }

  const variantId = weightedPick(
    eligibleVariants.map((item) => ({
      id: item.id,
      trafficPercent: item.trafficPercent,
    })),
  );
  return eligibleVariants.find((variant) => variant.id === variantId) ?? eligibleVariants[0] ?? null;
}

export function hashStringToPercent(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export async function readGuardrailsSnapshot(experimentId: string, since: Date) {
  const [exposures, errors, revenueEvents] = await Promise.all([
    prisma.experimentEvent.count({
      where: {
        experimentId,
        eventName: "exposure",
        occurredAt: { gte: since },
      },
    }),
    prisma.experimentEvent.count({
      where: {
        experimentId,
        eventName: "error",
        occurredAt: { gte: since },
      },
    }),
    prisma.experimentEvent.aggregate({
      where: {
        experimentId,
        revenue: { not: null },
        occurredAt: { gte: since },
      },
      _sum: { revenue: true },
    }),
  ]);

  const errorRate = exposures > 0 ? errors / exposures : 0;
  const revenuePerExposure = exposures > 0 ? (revenueEvents._sum.revenue ?? 0) / exposures : 0;

  return {
    exposures,
    errorRate,
    revenuePerExposure,
  };
}
