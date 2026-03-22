import { z } from "zod";

export const environmentItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listEnvironmentsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(environmentItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const createEnvironmentInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Key must have at least 2 characters.")
    .max(60, "Key must have at most 60 characters.")
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
  enabled: z.boolean().default(true),
});

export const updateEnvironmentInputSchema = z
  .object({
    key: createEnvironmentInputSchema.shape.key.optional(),
    name: createEnvironmentInputSchema.shape.name.optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must have at most 500 characters.")
      .nullable()
      .optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const upsertEnvironmentResponseSchema = z.object({
  success: z.literal(true),
  item: environmentItemSchema,
});

export const environmentErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type EnvironmentItem = z.infer<typeof environmentItemSchema>;
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentInputSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentInputSchema>;
export type ListEnvironmentsResponse = z.infer<typeof listEnvironmentsResponseSchema>;
