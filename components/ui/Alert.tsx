"use client";

import type { HTMLAttributes, ReactNode } from "react";

type AlertVariant = "error" | "warning" | "success" | "info" | "neutral";
type AlertSize = "sm" | "md";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  size?: AlertSize;
  icon?: ReactNode;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

const variantClassMap: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

const sizeClassMap: Record<AlertSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
};

function DefaultIcon({ variant }: { variant: AlertVariant }) {
  const iconByVariant: Record<AlertVariant, ReactNode> = {
    error: (
      <path
        d="M12 8V12M12 16H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    warning: (
      <path
        d="M12 8V12M12 16H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    success: (
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    info: (
      <path
        d="M12 8H12.01M11 12H12V16H13M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    neutral: (
      <path
        d="M12 8H12.01M11 12H12V16H13M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {iconByVariant[variant]}
    </svg>
  );
}

export function Alert({
  variant = "neutral",
  size = "md",
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "inline-flex w-full items-start gap-2 rounded-lg border",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 inline-flex shrink-0 items-center">
        {icon ?? <DefaultIcon variant={variant} />}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
