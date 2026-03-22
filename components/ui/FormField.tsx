import type { ReactNode } from "react";

type FormFieldProps = {
  label: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

export function FormField({
  label,
  children,
  htmlFor,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn("mt-4", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("text-xs uppercase tracking-wide text-slate-500", labelClassName)}
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
