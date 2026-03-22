import { z } from "zod";

export const navigationMenuItemSchema = z.object({
  id: z.enum(["dashboard", "featureFlags", "apiKeys", "environments", "projects"]),
  href: z.string(),
  labelKey: z.string(),
  icon: z.enum(["dashboard", "feature_flags", "api_keys", "environments", "projects"]),
});

export const navigationMenuResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(navigationMenuItemSchema),
});

export const navigationMenuErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type NavigationMenuItem = z.infer<typeof navigationMenuItemSchema>;
