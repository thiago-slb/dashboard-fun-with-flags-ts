"use client";

import type { ReactNode } from "react";

type H1Props = {
  children: ReactNode;
  className?: string;
};

function cn(...items: Array<string | undefined | null | false>) {
  return items.filter(Boolean).join(" ");
}

export function H1({ children, className }: H1Props) {
  return (
    <h1 className={cn("text-3xl font-semibold tracking-tight text-slate-900", className)}>
      {children}
    </h1>
  );
}
