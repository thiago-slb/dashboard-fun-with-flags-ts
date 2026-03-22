"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createProjectInputSchema,
  listProjectsResponseSchema,
  projectErrorResponseSchema,
  setActiveProjectInputSchema,
  setActiveProjectResponseSchema,
  updateProjectInputSchema,
  upsertProjectResponseSchema,
  type CreateProjectInput,
  type ListProjectsResponse,
  type SetActiveProjectInput,
  type UpdateProjectInput,
} from "@/lib/projects/schemas";

const PROJECTS_QUERY_KEY = ["projects"];
const INFINITE_PROJECTS_QUERY_KEY = [...PROJECTS_QUERY_KEY, "infinite"];
const PROJECTS_PAGE_SIZE = 20;

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = projectErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function useProjectsQuery(enabled = true) {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const response = await fetch("/api/projects");
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load projects."));
      }

      const parsed = listProjectsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading projects.");
      }

      return parsed.data.items;
    },
  });
}

export function useInfiniteProjectsQuery(searchQuery: string) {
  const normalizedSearch = searchQuery.trim();

  return useInfiniteQuery({
    queryKey: [...INFINITE_PROJECTS_QUERY_KEY, normalizedSearch],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PROJECTS_PAGE_SIZE),
      });

      if (pageParam) {
        params.set("cursor", pageParam);
      }
      if (normalizedSearch) {
        params.set("q", normalizedSearch);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load projects."));
      }

      const parsed = listProjectsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading projects.");
      }

      return parsed.data;
    },
    getNextPageParam: (lastPage: ListProjectsResponse) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const validInput = createProjectInputSchema.parse(input);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not create project."));
      }

      const parsed = upsertProjectResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while creating project.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_PROJECTS_QUERY_KEY });
    },
  });
}

type UpdatePayload = {
  id: string;
  data: UpdateProjectInput;
};

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdatePayload) => {
      const validInput = updateProjectInputSchema.parse(data);
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not update project."));
      }

      const parsed = upsertProjectResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while updating project.");
      }

      return parsed.data.item;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_PROJECTS_QUERY_KEY });
    },
  });
}

export function useSetActiveProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetActiveProjectInput) => {
      const validInput = setActiveProjectInputSchema.parse(input);
      const response = await fetch("/api/projects/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not switch project."));
      }

      const parsed = setActiveProjectResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while switching project.");
      }

      return parsed.data.projectId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: INFINITE_PROJECTS_QUERY_KEY });
    },
  });
}
