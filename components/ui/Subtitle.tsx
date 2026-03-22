"use client";

import type { ReactNode } from "react";

type SubtitleProps = {
  children: ReactNode;
  className?: string;
};

function cn(...items: Array<string | undefined | null | false>) {
  return items.filter(Boolean).join(" ");
}

export function Subtitle({ children, className }: SubtitleProps) {
  return <p className={cn("mt-1 text-sm text-slate-600", className)}>{children}</p>;
}
