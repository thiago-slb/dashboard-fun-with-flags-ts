"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExperimentInputSchema,
  deleteExperimentResponseSchema,
  experimentErrorResponseSchema,
  listExperimentsResponseSchema,
  updateExperimentInputSchema,
  upsertExperimentResponseSchema,
  analyticsOverviewResponseSchema,
  type CreateExperimentInput,
  type UpdateExperimentInput,
} from "@/lib/experiments/schemas";

const EXPERIMENTS_QUERY_KEY = ["experiments"];
const INFINITE_EXPERIMENTS_QUERY_KEY = [...EXPERIMENTS_QUERY_KEY, "infinite"];
const ANALYTICS_OVERVIEW_QUERY_KEY = ["analytics", "overview"];
const EXPERIMENTS_PAGE_SIZE = 20;

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = experimentErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function useInfiniteExperimentsQuery(searchQuery: string) {
  const normalizedSearch = searchQuery.trim();

  return useInfiniteQuery({
    queryKey: [...INFINITE_EXPERIMENTS_QUERY_KEY, normalizedSearch],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(EXPERIMENTS_PAGE_SIZE),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }
      if (normalizedSearch) {
        params.set("q", normalizedSearch);
      }

      const response = await fetch(`/api/experiments?${params.toString()}`);
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load experiments."));
      }

      const parsed = listExperimentsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading experiments.");
      }

      return parsed.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateExperimentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExperimentInput) => {
      const validInput = createExperimentInputSchema.parse(input);
      const response = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not create experiment."));
      }

      const parsed = upsertExperimentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while creating experiment.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_EXPERIMENTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ANALYTICS_OVERVIEW_QUERY_KEY });
    },
  });
}

type UpdatePayload = {
  id: string;
  data: UpdateExperimentInput;
};

export function useUpdateExperimentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePayload) => {
      const validInput = updateExperimentInputSchema.parse(data);
      const response = await fetch(`/api/experiments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not update experiment."));
      }

      const parsed = upsertExperimentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while updating experiment.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_EXPERIMENTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ANALYTICS_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useDeleteExperimentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/experiments/${id}`, {
        method: "DELETE",
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not delete experiment."));
      }

      const parsed = deleteExperimentResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while deleting experiment.");
      }

      return parsed.data.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_EXPERIMENTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ANALYTICS_OVERVIEW_QUERY_KEY });
    },
  });
}

export function useAnalyticsOverviewQuery() {
  return useQuery({
    queryKey: ANALYTICS_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/analytics/overview");
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load analytics overview."));
      }
      const parsed = analyticsOverviewResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading analytics overview.");
      }
      return parsed.data;
    },
    staleTime: 15_000,
  });
}
