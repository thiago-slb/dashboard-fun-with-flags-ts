import { z } from "zod";

export const experimentStatusSchema = z.enum(["DRAFT", "RUNNING", "PAUSED", "COMPLETED"]);
export const experimentAllocationModeSchema = z.enum(["FIXED", "BANDIT"]);
export const experimentTargetTypeSchema = z.enum(["USER", "FEATURE", "PAGE"]);
export const experimentDeviceTypeSchema = z.enum(["ANY", "MOBILE", "DESKTOP", "TABLET"]);

export const experimentVariantInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Variant key is required.")
    .max(40, "Variant key must have at most 40 characters.")
    .regex(/^[a-z0-9_]+$/, "Variant key must contain only lowercase letters, numbers and underscore."),
  name: z.string().trim().min(1, "Variant name is required.").max(80, "Variant name must have at most 80 characters."),
  trafficPercent: z.number().int().min(0).max(100),
  isControl: z.boolean().default(false),
});

export const experimentItemSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  environmentName: z.string(),
  featureFlagId: z.string().nullable(),
  featureFlagName: z.string().nullable(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: experimentStatusSchema,
  allocationMode: experimentAllocationModeSchema,
  targetType: experimentTargetTypeSchema,
  targetValue: z.string().nullable(),
  segmentCountry: z.string().nullable(),
  segmentDevice: experimentDeviceTypeSchema,
  stickyBucketing: z.boolean(),
  gradualRolloutEnabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100),
  autoStart: z.boolean(),
  autoStop: z.boolean(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
  goalEventName: z.string(),
  guardrailMaxErrorRate: z.number().nullable(),
  guardrailMinRevenue: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  variants: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      trafficPercent: z.number().int().min(0).max(100),
      isControl: z.boolean(),
    }),
  ),
});

const baseExperimentPayloadSchema = z
  .object({
    environmentId: z.string().min(1, "Environment is required."),
    featureFlagId: z.string().trim().min(1).nullable().optional(),
    key: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Key must have at least 2 characters.")
      .max(80, "Key must have at most 80 characters.")
      .regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers and underscore."),
    name: z.string().trim().min(2, "Name must have at least 2 characters.").max(120),
    description: z.string().trim().max(500).nullable().optional(),
    status: experimentStatusSchema.default("DRAFT"),
    allocationMode: experimentAllocationModeSchema.default("FIXED"),
    targetType: experimentTargetTypeSchema.default("USER"),
    targetValue: z.string().trim().max(160).nullable().optional(),
    segmentCountry: z.string().trim().max(3).nullable().optional(),
    segmentDevice: experimentDeviceTypeSchema.default("ANY"),
    stickyBucketing: z.boolean().default(true),
    gradualRolloutEnabled: z.boolean().default(false),
    rolloutPercent: z.number().int().min(0).max(100).default(100),
    autoStart: z.boolean().default(false),
    autoStop: z.boolean().default(false),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    goalEventName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9_]+$/, "Goal event must contain only lowercase letters, numbers and underscore.")
      .default("signup_completed"),
    guardrailMaxErrorRate: z.number().min(0).max(1).nullable().optional(),
    guardrailMinRevenue: z.number().min(0).nullable().optional(),
    variants: z.array(experimentVariantInputSchema).min(2).max(8),
  })
  .strict()
  .superRefine((input, ctx) => {
    const totalPercent = input.variants.reduce((acc, item) => acc + item.trafficPercent, 0);
    if (totalPercent !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant traffic percentages must sum to 100.",
      });
    }

    if (input.autoStart && !input.startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "Start date is required when auto-start is enabled.",
      });
    }

    if (input.autoStop && !input.endAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End date is required when auto-stop is enabled.",
      });
    }

    if (input.startAt && input.endAt && new Date(input.startAt) >= new Date(input.endAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End date must be after start date.",
      });
    }
  });

export const createExperimentInputSchema = baseExperimentPayloadSchema;

export const updateExperimentInputSchema = z
  .object({
    environmentId: z.string().min(1, "Environment is required.").optional(),
    featureFlagId: z.string().trim().min(1).nullable().optional(),
    key: baseExperimentPayloadSchema.shape.key.optional(),
    name: baseExperimentPayloadSchema.shape.name.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    status: experimentStatusSchema.optional(),
    allocationMode: experimentAllocationModeSchema.optional(),
    targetType: experimentTargetTypeSchema.optional(),
    targetValue: z.string().trim().max(160).nullable().optional(),
    segmentCountry: z.string().trim().max(3).nullable().optional(),
    segmentDevice: experimentDeviceTypeSchema.optional(),
    stickyBucketing: z.boolean().optional(),
    gradualRolloutEnabled: z.boolean().optional(),
    rolloutPercent: z.number().int().min(0).max(100).optional(),
    autoStart: z.boolean().optional(),
    autoStop: z.boolean().optional(),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    goalEventName: baseExperimentPayloadSchema.shape.goalEventName.optional(),
    guardrailMaxErrorRate: z.number().min(0).max(1).nullable().optional(),
    guardrailMinRevenue: z.number().min(0).nullable().optional(),
    variants: z.array(experimentVariantInputSchema).min(2).max(8).optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided.",
  });

export const listExperimentsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(experimentItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const upsertExperimentResponseSchema = z.object({
  success: z.literal(true),
  item: experimentItemSchema,
});

export const deleteExperimentResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export const experimentErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const experimentAssignInputSchema = z.object({
  experimentKey: z.string().trim().toLowerCase().min(1),
  userKey: z.string().trim().min(1),
  country: z.string().trim().max(3).optional(),
  device: experimentDeviceTypeSchema.optional(),
  featureKey: z.string().trim().optional(),
  pagePath: z.string().trim().optional(),
});

export const experimentAssignResponseSchema = z.object({
  success: z.literal(true),
  experimentId: z.string(),
  experimentKey: z.string(),
  variantKey: z.string(),
  variantName: z.string(),
  assignmentId: z.string(),
});

export const experimentTrackEventInputSchema = z.object({
  experimentKey: z.string().trim().toLowerCase().min(1),
  userKey: z.string().trim().optional(),
  variantKey: z.string().trim().toLowerCase().optional(),
  eventName: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9_]+$/, "Event name must contain only lowercase letters, numbers and underscore."),
  pagePath: z.string().trim().max(300).optional(),
  featureKey: z.string().trim().max(120).optional(),
  country: z.string().trim().max(3).optional(),
  device: experimentDeviceTypeSchema.optional(),
  revenue: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const experimentTrackEventResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export const experimentAnalyticsVariantSchema = z.object({
  variantId: z.string(),
  variantKey: z.string(),
  variantName: z.string(),
  exposures: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  revenue: z.number(),
  ctr: z.number(),
  conversionRate: z.number(),
});

export const experimentAnalyticsItemSchema = z.object({
  experimentId: z.string(),
  key: z.string(),
  name: z.string(),
  status: experimentStatusSchema,
  goalEventName: z.string(),
  variants: z.array(experimentAnalyticsVariantSchema),
});

export const analyticsOverviewResponseSchema = z.object({
  success: z.literal(true),
  summary: z.object({
    featureFlagsTotal: z.number(),
    featureFlagsEnabled: z.number(),
    experimentsTotal: z.number(),
    experimentsRunning: z.number(),
    eventsLast7Days: z.number(),
    revenueLast7Days: z.number(),
  }),
  experiments: z.array(experimentAnalyticsItemSchema),
});

export type ExperimentItem = z.infer<typeof experimentItemSchema>;
export type CreateExperimentInput = z.infer<typeof createExperimentInputSchema>;
export type UpdateExperimentInput = z.infer<typeof updateExperimentInputSchema>;
