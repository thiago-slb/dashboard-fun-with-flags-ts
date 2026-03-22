"use client";

import { useMutation } from "@tanstack/react-query";
import {
  signUpErrorResponseSchema,
  signUpInputSchema,
  signUpSuccessResponseSchema,
  type SignUpInput,
  type SignUpSuccessResponse,
} from "@/lib/auth/schemas";

async function signUpRequest(payload: SignUpInput): Promise<SignUpSuccessResponse> {
  const validPayload = signUpInputSchema.parse(payload);

  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validPayload),
  });

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = signUpErrorResponseSchema.safeParse(json);
    throw new Error(
      parsedError.success
        ? parsedError.data.error.message
        : "Could not create account.",
    );
  }

  const parsedResponse = signUpSuccessResponseSchema.safeParse(json);
  if (!parsedResponse.success) {
    throw new Error("Invalid response from signup endpoint.");
  }

  return parsedResponse.data;
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: signUpRequest,
  });
}
