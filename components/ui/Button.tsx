"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "unstyled";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "none";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loadingLabel?: string;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-[#465fff] text-white hover:bg-[#364ed9] disabled:bg-[#465fff] disabled:text-white",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-white",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600",
  unstyled: "",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10",
  none: "",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  loadingLabel = "Loading...",
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex cursor-pointer flex-row items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
        variantClassMap[variant],
        sizeClassMap[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-25"
            />
            <path d="M21 12A9 9 0 0 0 12 3" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="inline-flex items-center">{loadingLabel}</span>
        </>
      ) : (
        <>
          {leftIcon ? <span className="inline-flex shrink-0 items-center">{leftIcon}</span> : null}
          {children ? <span className="inline-flex items-center">{children}</span> : null}
          {rightIcon ? <span className="inline-flex shrink-0 items-center">{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
}
