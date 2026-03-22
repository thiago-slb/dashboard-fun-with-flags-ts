"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  createFeatureFlagInputSchema,
  deleteFeatureFlagResponseSchema,
  featureFlagErrorResponseSchema,
  listFeatureFlagsResponseSchema,
  updateFeatureFlagInputSchema,
  upsertFeatureFlagResponseSchema,
  type CreateFeatureFlagInput,
  type FeatureFlagItem,
  type UpdateFeatureFlagInput,
} from "@/lib/feature-flags/schemas";

const FEATURE_FLAGS_QUERY_KEY = ["feature-flags"];
const INFINITE_FEATURE_FLAGS_QUERY_KEY = [...FEATURE_FLAGS_QUERY_KEY, "infinite"];
const FEATURE_FLAGS_PAGE_SIZE = 20;

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = featureFlagErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

function formatFieldName(path: PropertyKey[]) {
  if (path.length === 0) {
    return "Field";
  }
  const key = String(path[path.length - 1] ?? "field");
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatZodValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${formatFieldName(issue.path)}: ${issue.message}`)
    .join("\n");
}

export function useFeatureFlagsQuery() {
  return useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/feature-flags");
      const payload = await parseJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load feature flags."));
      }

      const parsed = listFeatureFlagsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading feature flags.");
      }

      return parsed.data.items;
    },
  });
}

export function useInfiniteFeatureFlagsQuery(searchQuery: string) {
  const normalizedSearch = searchQuery.trim();

  return useInfiniteQuery({
    queryKey: [...INFINITE_FEATURE_FLAGS_QUERY_KEY, normalizedSearch],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(FEATURE_FLAGS_PAGE_SIZE),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }
      if (normalizedSearch) {
        params.set("q", normalizedSearch);
      }

      const response = await fetch(`/api/feature-flags?${params.toString()}`);
      const payload = await parseJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load feature flags."));
      }

      const parsed = listFeatureFlagsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading feature flags.");
      }

      return parsed.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateFeatureFlagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFeatureFlagInput) => {
      const parsedInput = createFeatureFlagInputSchema.safeParse(input);
      if (!parsedInput.success) {
        throw new Error(formatZodValidationError(parsedInput.error));
      }

      const validInput = parsedInput.data;
      const response = await fetch("/api/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not create feature flag."));
      }

      const parsed = upsertFeatureFlagResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while creating feature flag.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_FEATURE_FLAGS_QUERY_KEY });
    },
  });
}

type UpdatePayload = {
  id: string;
  data: UpdateFeatureFlagInput;
};

export function useUpdateFeatureFlagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePayload) => {
      const parsedInput = updateFeatureFlagInputSchema.safeParse(data);
      if (!parsedInput.success) {
        throw new Error(formatZodValidationError(parsedInput.error));
      }

      const validInput = parsedInput.data;
      const response = await fetch(`/api/feature-flags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not update feature flag."));
      }

      const parsed = upsertFeatureFlagResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while updating feature flag.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_FEATURE_FLAGS_QUERY_KEY });
    },
  });
}

export function useDeleteFeatureFlagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/feature-flags/${id}`, {
        method: "DELETE",
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not delete feature flag."));
      }

      const parsed = deleteFeatureFlagResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while deleting feature flag.");
      }

      return parsed.data.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_FEATURE_FLAGS_QUERY_KEY });
    },
  });
}

export function getPatchForInlineEdit(
  current: FeatureFlagItem,
  next: {
    environmentId: string;
    key: string;
    name: string;
    description: string;
    rolloutPercent: number;
  },
) {
  const patch: UpdateFeatureFlagInput = {};

  if (next.environmentId !== current.environmentId) {
    patch.environmentId = next.environmentId;
  }
  if (next.key !== current.key) patch.key = next.key;
  if (next.name !== current.name) patch.name = next.name;

  const nextDescription = next.description.trim();
  const currentDescription = current.description ?? "";
  if (nextDescription !== currentDescription) {
    patch.description = nextDescription.length > 0 ? nextDescription : null;
  }

  if (next.rolloutPercent !== current.rolloutPercent) {
    patch.rolloutPercent = next.rolloutPercent;
  }

  return patch;
}
