"use client";

import { useQuery } from "@tanstack/react-query";
import {
  navigationMenuErrorResponseSchema,
  navigationMenuResponseSchema,
} from "@/lib/navigation/schemas";

const NAVIGATION_MENU_QUERY_KEY = ["navigation", "menu"];

async function parseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = navigationMenuErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function useNavigationMenuQuery() {
  return useQuery({
    queryKey: NAVIGATION_MENU_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/navigation/menu");
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not load navigation menu."));
      }

      const parsed = navigationMenuResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid response while loading navigation menu.");
      }

      return parsed.data.items;
    },
  });
}
