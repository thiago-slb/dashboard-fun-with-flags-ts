import { z } from "zod";

export const featureFlagSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  environmentKey: z.string(),
  environmentName: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listFeatureFlagsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(featureFlagSchema),
});

export const createFeatureFlagInputSchema = z.object({
  environmentId: z.string().min(1, "Environment is required."),
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Key must have at least 2 characters.")
    .max(80, "Key must have at most 80 characters.")
    .regex(
      /^[a-z0-9_]+$/,
      "Key must contain only lowercase letters, numbers and underscore.",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Name must have at least 2 characters.")
    .max(120, "Name must have at most 120 characters."),
  description: z
    .string()
    .trim()
    .max(500, "Description must have at most 500 characters.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  enabled: z.boolean().default(false),
  rolloutPercent: z.number().int().min(0).max(100).default(0),
});

export const updateFeatureFlagInputSchema = z
  .object({
    environmentId: z.string().min(1, "Environment is required.").optional(),
    key: createFeatureFlagInputSchema.shape.key.optional(),
    name: createFeatureFlagInputSchema.shape.name.optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must have at most 500 characters.")
      .nullable()
      .optional(),
    enabled: z.boolean().optional(),
    rolloutPercent: z.number().int().min(0).max(100).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided.",
  });

export const upsertFeatureFlagResponseSchema = z.object({
  success: z.literal(true),
  item: featureFlagSchema,
});

export const deleteFeatureFlagResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export const featureFlagErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type FeatureFlagItem = z.infer<typeof featureFlagSchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagInputSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagInputSchema>;
