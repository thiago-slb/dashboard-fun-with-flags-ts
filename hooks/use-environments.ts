"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEnvironmentInputSchema,
  deleteEnvironmentResponseSchema,
  environmentErrorResponseSchema,
  listEnvironmentsResponseSchema,
  updateEnvironmentInputSchema,
  upsertEnvironmentResponseSchema,
  type CreateEnvironmentInput,
  type UpdateEnvironmentInput,
} from "@/lib/environments/schemas";

const ENVIRONMENTS_QUERY_KEY = ["environments"];

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = environmentErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function useEnvironmentsQuery() {
  return useQuery({
    queryKey: ENVIRONMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/environments");
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load environments."));
      }

      const parsed = listEnvironmentsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading environments.");
      }

      return parsed.data.items;
    },
  });
}

export function useCreateEnvironmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEnvironmentInput) => {
      const validInput = createEnvironmentInputSchema.parse(input);
      const response = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not create environment."));
      }

      const parsed = upsertEnvironmentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while creating environment.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENVIRONMENTS_QUERY_KEY });
    },
  });
}

type UpdatePayload = {
  id: string;
  data: UpdateEnvironmentInput;
};

export function useUpdateEnvironmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePayload) => {
      const validInput = updateEnvironmentInputSchema.parse(data);
      const response = await fetch(`/api/environments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not update environment."));
      }

      const parsed = upsertEnvironmentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while updating environment.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENVIRONMENTS_QUERY_KEY });
    },
  });
}

export function useDeleteEnvironmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/environments/${id}`, {
        method: "DELETE",
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not delete environment."));
      }

      const parsed = deleteEnvironmentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while deleting environment.");
      }

      return parsed.data.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENVIRONMENTS_QUERY_KEY });
    },
  });
}
