"use client";

import { useMemo, useState, type ChangeEvent, type OptionHTMLAttributes, type SelectHTMLAttributes } from "react";

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

export type SelectItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  options?: SelectItem[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  selectClassName?: string;
  searchClassName?: string;
};

export function Select({
  options,
  searchable = false,
  searchPlaceholder = "Search options...",
  onChange,
  className,
  selectClassName,
  searchClassName,
  children,
  ...props
}: SelectProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!options) {
      return [];
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, search]);

  return (
    <div className={cn("w-full", className)}>
      {searchable ? (
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            "mb-2 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]",
            searchClassName,
          )}
        />
      ) : null}
      <select
        {...props}
        onChange={onChange}
        className={cn(
          "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]",
          selectClassName,
        )}
      >
        {options
          ? filteredOptions.map((option) => (
              <SelectOption key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectOption>
            ))
          : children}
      </select>
    </div>
  );
}

export function SelectOption(props: OptionHTMLAttributes<HTMLOptionElement>) {
  return <option {...props} />;
}
