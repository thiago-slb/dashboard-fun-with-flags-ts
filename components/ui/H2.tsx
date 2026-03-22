"use client";

import type { ReactNode } from "react";

type H2Props = {
  children: ReactNode;
  className?: string;
};

function cn(...items: Array<string | undefined | null | false>) {
  return items.filter(Boolean).join(" ");
}

export function H2({ children, className }: H2Props) {
  return <h2 className={cn("text-base font-semibold text-slate-900", className)}>{children}</h2>;
}
