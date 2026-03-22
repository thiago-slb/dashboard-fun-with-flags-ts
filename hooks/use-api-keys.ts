"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  apiKeyErrorResponseSchema,
  createApiKeyInputSchema,
  createApiKeyResponseSchema,
  deleteApiKeyResponseSchema,
  listApiKeysResponseSchema,
  updateApiKeyInputSchema,
  upsertApiKeyResponseSchema,
  type CreateApiKeyInput,
  type ListApiKeysResponse,
  type UpdateApiKeyInput,
} from "@/lib/api-keys/schemas";

const API_KEYS_QUERY_KEY = ["api-keys"];
const INFINITE_API_KEYS_QUERY_KEY = [...API_KEYS_QUERY_KEY, "infinite"];
const API_KEYS_PAGE_SIZE = 20;

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = apiKeyErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function useInfiniteApiKeysQuery(searchQuery: string, environmentId: string) {
  const normalizedSearch = searchQuery.trim();
  const normalizedEnvironment = environmentId.trim();

  return useInfiniteQuery({
    queryKey: [...INFINITE_API_KEYS_QUERY_KEY, normalizedSearch, normalizedEnvironment],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(API_KEYS_PAGE_SIZE),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }
      if (normalizedSearch) {
        params.set("q", normalizedSearch);
      }
      if (normalizedEnvironment) {
        params.set("environmentId", normalizedEnvironment);
      }

      const response = await fetch(`/api/api-keys?${params.toString()}`);
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load API keys."));
      }

      const parsed = listApiKeysResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading API keys.");
      }

      return parsed.data;
    },
    getNextPageParam: (lastPage: ListApiKeysResponse) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const validInput = createApiKeyInputSchema.parse(input);
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not create API key."));
      }

      const parsed = createApiKeyResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while creating API key.");
      }

      return parsed.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_API_KEYS_QUERY_KEY });
    },
  });
}

type UpdatePayload = {
  id: string;
  data: UpdateApiKeyInput;
};

export function useUpdateApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePayload) => {
      const validInput = updateApiKeyInputSchema.parse(data);
      const response = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not update API key."));
      }

      const parsed = upsertApiKeyResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while updating API key.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_API_KEYS_QUERY_KEY });
    },
  });
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not delete API key."));
      }

      const parsed = deleteApiKeyResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while deleting API key.");
      }

      return parsed.data.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INFINITE_API_KEYS_QUERY_KEY });
    },
  });
}
