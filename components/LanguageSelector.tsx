"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
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
      <Button
        onClick={() => setOpen((prev) => !prev)}
        variant="outline"
        size="sm"
        className="ring-[#465fff]/10 focus:border-[#465fff] focus:ring-4"
        rightIcon={
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
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {LOCALE_NATIVE_LABELS[locale]}
      </Button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          {supportedLocales.map((supportedLocale) => (
            <li key={supportedLocale}>
              <Button
                role="option"
                aria-selected={locale === supportedLocale}
                onClick={() => {
                  setLocale(supportedLocale as Locale);
                  setOpen(false);
                }}
                variant="ghost"
                size="sm"
                className={`w-full justify-start rounded-md ${
                  locale === supportedLocale
                    ? "bg-[#465fff]/10 text-[#364ed9]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {LOCALE_NATIVE_LABELS[supportedLocale]}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
