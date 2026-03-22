"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createEnvironmentInputSchema,
  environmentErrorResponseSchema,
  listEnvironmentsResponseSchema,
  updateEnvironmentInputSchema,
  upsertEnvironmentResponseSchema,
  type CreateEnvironmentInput,
  type ListEnvironmentsResponse,
  type UpdateEnvironmentInput,
} from "@/lib/environments/schemas";

const ENVIRONMENTS_QUERY_KEY = ["environments"];
const INFINITE_ENVIRONMENTS_QUERY_KEY = [...ENVIRONMENTS_QUERY_KEY, "infinite"];
const ENVIRONMENTS_PAGE_SIZE = 20;

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

export function useInfiniteEnvironmentsQuery(searchQuery: string) {
  const normalizedSearch = searchQuery.trim();

  return useInfiniteQuery({
    queryKey: [...INFINITE_ENVIRONMENTS_QUERY_KEY, normalizedSearch],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(ENVIRONMENTS_PAGE_SIZE),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }
      if (normalizedSearch) {
        params.set("q", normalizedSearch);
      }

      const response = await fetch(`/api/environments?${params.toString()}`);
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load environments."));
      }

      const parsed = listEnvironmentsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading environments.");
      }

      return parsed.data;
    },
    getNextPageParam: (lastPage: ListEnvironmentsResponse) =>
      lastPage.nextCursor ?? undefined,
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
      await queryClient.invalidateQueries({ queryKey: INFINITE_ENVIRONMENTS_QUERY_KEY });
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
      await queryClient.invalidateQueries({ queryKey: INFINITE_ENVIRONMENTS_QUERY_KEY });
    },
  });
}
