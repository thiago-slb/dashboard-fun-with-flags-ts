"use client";

import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

type CardProps<T extends ElementType = "section"> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

function cn(...items: Array<string | undefined | null | false>) {
  return items.filter(Boolean).join(" ");
}

const CARD_BASE_CLASS =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]";

export function Card<T extends ElementType = "section">({
  as,
  children,
  className,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "section") as ElementType;

  return (
    <Component className={cn(CARD_BASE_CLASS, className)} {...props}>
      {children}
    </Component>
  );
}
