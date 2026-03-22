"use client";

import type { HTMLAttributes } from "react";

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      {...props}
    />
  );
}
