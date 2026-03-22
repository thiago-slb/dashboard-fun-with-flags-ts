import { z } from "zod";

export const apiKeyItemSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  environmentKey: z.string(),
  environmentName: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  canReadFeatureFlags: z.boolean(),
  enabled: z.boolean(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listApiKeysResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(apiKeyItemSchema),
});

export const createApiKeyInputSchema = z.object({
  environmentId: z.string().min(1, "Environment is required."),
  name: z
    .string()
    .trim()
    .min(2, "Name must have at least 2 characters.")
    .max(120, "Name must have at most 120 characters."),
  canReadFeatureFlags: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export const updateApiKeyInputSchema = z
  .object({
    environmentId: z.string().min(1, "Environment is required.").optional(),
    name: createApiKeyInputSchema.shape.name.optional(),
    canReadFeatureFlags: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const createApiKeyResponseSchema = z.object({
  success: z.literal(true),
  item: apiKeyItemSchema,
  apiKey: z.string(),
});

export const upsertApiKeyResponseSchema = z.object({
  success: z.literal(true),
  item: apiKeyItemSchema,
});

export const deleteApiKeyResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export const apiKeyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiKeyItem = z.infer<typeof apiKeyItemSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeyInputSchema>;
