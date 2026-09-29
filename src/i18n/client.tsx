"use client";

import { createContext, useContext, useMemo } from "react";
import { createTranslator, type Translator } from "./core";
import type { UiLocale } from "./config";

type I18nContextValue = {
  locale: UiLocale;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: UiLocale;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return context;
}

export function useTranslations() {
  return useI18n().t;
}
