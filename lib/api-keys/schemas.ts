import { z } from "zod";

const apiKeyPermissionsBaseSchema = z.object({
  canReadFeatureFlags: z.boolean().default(true),
  canWriteFeatureFlags: z.boolean().default(false),
  canReadEnvironments: z.boolean().default(false),
  canWriteEnvironments: z.boolean().default(false),
  canReadProjects: z.boolean().default(false),
  canWriteProjects: z.boolean().default(false),
});

export const apiKeyPermissionsSchema = apiKeyPermissionsBaseSchema
  .refine((data) => !data.canWriteFeatureFlags || data.canReadFeatureFlags, {
    message: "Feature flags write permission requires read permission.",
    path: ["canWriteFeatureFlags"],
  })
  .refine((data) => !data.canWriteEnvironments || data.canReadEnvironments, {
    message: "Environments write permission requires read permission.",
    path: ["canWriteEnvironments"],
  })
  .refine((data) => !data.canWriteProjects || data.canReadProjects, {
    message: "Projects write permission requires read permission.",
    path: ["canWriteProjects"],
  });

export const apiKeyItemSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  environmentKey: z.string(),
  environmentName: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  canReadFeatureFlags: z.boolean(),
  canWriteFeatureFlags: z.boolean(),
  canReadEnvironments: z.boolean(),
  canWriteEnvironments: z.boolean(),
  canReadProjects: z.boolean(),
  canWriteProjects: z.boolean(),
  enabled: z.boolean(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listApiKeysResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(apiKeyItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const createApiKeyInputSchema = z.object({
  environmentId: z.string().min(1, "Environment is required."),
  name: z
    .string()
    .trim()
    .min(2, "Name must have at least 2 characters.")
    .max(120, "Name must have at most 120 characters."),
  ...apiKeyPermissionsBaseSchema.shape,
  enabled: z.boolean().default(true),
}).strict().refine((data) => !data.canWriteFeatureFlags || data.canReadFeatureFlags, {
  message: "Feature flags write permission requires read permission.",
  path: ["canWriteFeatureFlags"],
}).refine((data) => !data.canWriteEnvironments || data.canReadEnvironments, {
  message: "Environments write permission requires read permission.",
  path: ["canWriteEnvironments"],
}).refine((data) => !data.canWriteProjects || data.canReadProjects, {
  message: "Projects write permission requires read permission.",
  path: ["canWriteProjects"],
});

export const updateApiKeyInputSchema = z
  .object({
    environmentId: z.string().min(1, "Environment is required.").optional(),
    name: createApiKeyInputSchema.shape.name.optional(),
    canReadFeatureFlags: z.boolean().optional(),
    canWriteFeatureFlags: z.boolean().optional(),
    canReadEnvironments: z.boolean().optional(),
    canWriteEnvironments: z.boolean().optional(),
    canReadProjects: z.boolean().optional(),
    canWriteProjects: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  })
  .refine(
    (data) =>
      data.canWriteFeatureFlags === undefined ||
      data.canWriteFeatureFlags === false ||
      data.canReadFeatureFlags !== false,
    {
      message: "Feature flags write permission requires read permission.",
      path: ["canWriteFeatureFlags"],
    }
  )
  .refine(
    (data) =>
      data.canWriteEnvironments === undefined ||
      data.canWriteEnvironments === false ||
      data.canReadEnvironments !== false,
    {
      message: "Environments write permission requires read permission.",
      path: ["canWriteEnvironments"],
    }
  )
  .refine(
    (data) =>
      data.canWriteProjects === undefined ||
      data.canWriteProjects === false ||
      data.canReadProjects !== false,
    {
      message: "Projects write permission requires read permission.",
      path: ["canWriteProjects"],
    }
  );

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
export type ListApiKeysResponse = z.infer<typeof listApiKeysResponseSchema>;
