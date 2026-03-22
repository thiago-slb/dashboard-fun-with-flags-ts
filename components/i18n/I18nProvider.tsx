"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  translations,
  type Locale,
} from "@/lib/i18n/translations";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  supportedLocales: readonly Locale[];
};

const I18nContext = createContext<I18nContextValue | null>(null);
const LOCALE_CHANGE_EVENT = "fwf-locale-change";

function resolveLocale(value: string | null): Locale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  return SUPPORTED_LOCALES.includes(value as Locale)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

function getByPath(source: unknown, path: string) {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, segment) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      source,
    );

  return typeof value === "string" ? value : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const callback = () => onStoreChange();
      window.addEventListener("storage", callback);
      window.addEventListener(LOCALE_CHANGE_EVENT, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
      };
    },
    () => {
      if (typeof window === "undefined") {
        return DEFAULT_LOCALE;
      }
      return resolveLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    },
    () => DEFAULT_LOCALE,
  );

  const setLocale = useCallback((nextLocale: Locale) => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  const t = useCallback(
    (key: string) => getByPath(translations[locale], key),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
