"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  LOCALE_NATIVE_LABELS,
  type Locale,
} from "@/lib/i18n/translations";

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, supportedLocales } = useI18n();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none ring-[#465fff]/10 transition hover:bg-gray-50 focus:border-[#465fff] focus:ring-4"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{LOCALE_NATIVE_LABELS[locale]}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M4.79175 7.39584L10.0001 12.6042L15.2084 7.39585"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          {supportedLocales.map((supportedLocale) => (
            <li key={supportedLocale}>
              <button
                type="button"
                role="option"
                aria-selected={locale === supportedLocale}
                onClick={() => {
                  setLocale(supportedLocale as Locale);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition ${
                  locale === supportedLocale
                    ? "bg-[#465fff]/10 text-[#364ed9]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {LOCALE_NATIVE_LABELS[supportedLocale]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
