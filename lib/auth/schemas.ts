import { z } from "zod";

export const signUpInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must have at least 2 characters.")
      .max(80, "Name must have at most 80 characters."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email.")
      .max(120, "Email must have at most 120 characters."),
    password: z
      .string()
      .min(8, "Password must have at least 8 characters.")
      .max(72, "Password must have at most 72 characters.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/[0-9]/, "Password must include at least one number.")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must include at least one special character.",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signUpSuccessResponseSchema = z.object({
  success: z.literal(true),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
  }),
});

export const signUpErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const updateProfileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must have at least 2 characters.")
    .max(80, "Name must have at most 80 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email.")
    .max(120, "Email must have at most 120 characters."),
});

export const updateProfileSuccessResponseSchema = z.object({
  success: z.literal(true),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().email(),
  }),
});

export const logoutSuccessResponseSchema = z.object({
  success: z.literal(true),
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SignUpSuccessResponse = z.infer<typeof signUpSuccessResponseSchema>;
export type SignUpErrorResponse = z.infer<typeof signUpErrorResponseSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
