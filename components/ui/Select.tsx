"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type OptionHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

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
  searchToggleLabel?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  selectClassName?: string;
  searchClassName?: string;
};

export function Select({
  options,
  searchable = false,
  searchPlaceholder = "Search options...",
  searchToggleLabel = "Search",
  onChange,
  className,
  selectClassName,
  searchClassName,
  children,
  ...props
}: SelectProps) {
  const {
    value,
    defaultValue,
    disabled,
    name,
    id,
    required,
    autoComplete,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    ...restProps
  } = props;

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectUid = useId();
  const selectBaseId = id ?? `fwf-select-${selectUid}`;
  const listboxId = `${selectBaseId}-listbox`;

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

  const selectedValue = String(value ?? defaultValue ?? "");
  const selectedOption = useMemo(
    () => options?.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const selectedLabel = selectedOption?.label ?? filteredOptions[0]?.label ?? "";
  const selectedIndexInFiltered = useMemo(
    () => filteredOptions.findIndex((option) => option.value === selectedValue),
    [filteredOptions, selectedValue],
  );

  useEffect(() => {
    if (isOpen && isSearchVisible) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, isSearchVisible]);

  function closeDropdown() {
    setIsOpen(false);
    setIsSearchVisible(false);
    setSearch("");
    setHighlightedIndex(-1);
  }

  function getEnabledIndexFrom(start: number, direction: 1 | -1) {
    if (filteredOptions.length === 0) {
      return -1;
    }

    let cursor = start;
    for (let i = 0; i < filteredOptions.length; i += 1) {
      cursor = (cursor + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[cursor]?.disabled) {
        return cursor;
      }
    }

    return -1;
  }

  function getFirstEnabledIndex() {
    return filteredOptions.findIndex((option) => !option.disabled);
  }

  function getInitialHighlightedIndex() {
    if (
      selectedIndexInFiltered >= 0 &&
      !filteredOptions[selectedIndexInFiltered]?.disabled
    ) {
      return selectedIndexInFiltered;
    }
    return getFirstEnabledIndex();
  }

  function commitHighlightedOption() {
    if (highlightedIndex < 0) {
      return;
    }
    const option = filteredOptions[highlightedIndex];
    if (!option || option.disabled) {
      return;
    }
    emitChange(option.value);
    closeDropdown();
  }

  function handleKeyboardNavigation(event: ReactKeyboardEvent<HTMLElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "Tab" && isOpen) {
      closeDropdown();
      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        closeDropdown();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(getInitialHighlightedIndex());
        return;
      }
      setHighlightedIndex((current) => getEnabledIndexFrom(current < 0 ? -1 : current, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const firstEnabled = getFirstEnabledIndex();
        setHighlightedIndex(
          firstEnabled < 0 ? -1 : getEnabledIndexFrom(firstEnabled, -1),
        );
        return;
      }
      setHighlightedIndex((current) =>
        getEnabledIndexFrom(current < 0 ? 0 : current, -1),
      );
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(getFirstEnabledIndex());
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const firstEnabled = getFirstEnabledIndex();
      setHighlightedIndex(
        firstEnabled < 0 ? -1 : getEnabledIndexFrom(firstEnabled, -1),
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commitHighlightedOption();
    }
  }

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return;
    }

    const optionId = `${listboxId}-option-${highlightedIndex}`;
    const optionElement = document.getElementById(optionId);
    optionElement?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, listboxId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  function emitChange(nextValue: string) {
    if (!onChange) {
      return;
    }
    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  }

  const shouldUseSearchableDropdown = searchable && Array.isArray(options);

  if (shouldUseSearchableDropdown) {
    return (
      <div
        ref={rootRef}
        className={cn("relative w-full", className)}
        onKeyDown={handleKeyboardNavigation}
      >
        <input type="hidden" name={name} value={selectedValue} />
        <button
          type="button"
          id={selectBaseId}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          onClick={() => {
            if (isOpen) {
              closeDropdown();
              return;
            }
            setHighlightedIndex(getInitialHighlightedIndex());
            setIsOpen(true);
          }}
          className={cn(
            "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-left text-sm outline-none transition focus:border-[#465fff]",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
            "flex items-center justify-between gap-3",
            selectClassName,
          )}
        >
          <span className={cn(selectedValue ? "text-slate-900" : "text-slate-500")}>
            {selectedLabel || searchPlaceholder}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={cn("text-slate-500 transition-transform", isOpen && "rotate-180")}
          >
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={selectBaseId}
            className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          >
            <div className="mb-2 border-b border-slate-100 pb-2">
              {isSearchVisible ? (
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className={cn(
                      "h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 pr-9 text-sm outline-none focus:border-[#465fff] focus:bg-white",
                      searchClassName,
                    )}
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchVisible(true)}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M20 20L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {searchToggleLabel}
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto pr-1">
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-500">No options found.</p>
              ) : (
                filteredOptions.map((option, optionIndex) => {
                  const isSelected = option.value === selectedValue;
                  const isHighlighted =
                    highlightedIndex >= 0 && highlightedIndex === optionIndex;
                  return (
                    <button
                      id={`${listboxId}-option-${optionIndex}`}
                      key={`${option.value}-${option.label}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      disabled={option.disabled}
                      onMouseEnter={() => {
                        setHighlightedIndex(optionIndex);
                      }}
                      onClick={() => {
                        emitChange(option.value);
                        closeDropdown();
                      }}
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition",
                        isHighlighted
                          ? "bg-slate-100 text-slate-900"
                          : isSelected
                            ? "bg-[#eef2ff] text-[#2f47d6]"
                            : "text-slate-700 hover:bg-slate-50",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        <select
          {...restProps}
          id={id}
          name={name}
          value={selectedValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        >
          {options.map((option) => (
            <SelectOption key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectOption>
          ))}
        </select>
      </div>
    );
  }

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
        {...restProps}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
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
