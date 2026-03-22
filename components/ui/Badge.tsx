"use client";

import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";
type BadgeSize = "sm" | "md";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
};

function cn(...items: Array<string | null | undefined | false>) {
  return items.filter(Boolean).join(" ");
}

const variantClassMap: Record<BadgeVariant, string> = {
  default: "bg-[#465fff]/10 text-[#364ed9]",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-slate-100 text-slate-700",
};

const dotClassMap: Record<BadgeVariant, string> = {
  default: "bg-[#465fff]",
  success: "bg-emerald-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  neutral: "bg-slate-500",
};

const sizeClassMap: Record<BadgeSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
};

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg font-medium",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotClassMap[variant])} /> : null}
      <span>{children}</span>
    </span>
  );
}
