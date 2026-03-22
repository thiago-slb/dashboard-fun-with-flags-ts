import { z } from "zod";

export const projectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listProjectsResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(projectItemSchema),
  nextCursor: z.string().nullable(),
});

export const createProjectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must have at least 2 characters.")
    .max(120, "Project name must have at most 120 characters."),
});

export const updateProjectInputSchema = z
  .object({
    name: createProjectInputSchema.shape.name.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const setActiveProjectInputSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
});

export const upsertProjectResponseSchema = z.object({
  success: z.literal(true),
  item: projectItemSchema,
});

export const setActiveProjectResponseSchema = z.object({
  success: z.literal(true),
  projectId: z.string(),
});

export const projectErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ProjectItem = z.infer<typeof projectItemSchema>;
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type SetActiveProjectInput = z.infer<typeof setActiveProjectInputSchema>;
