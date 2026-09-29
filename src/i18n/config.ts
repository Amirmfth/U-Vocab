import type { UiLocale as PrismaUiLocale } from "@prisma/client";

export const UI_LOCALES = ["en", "fa"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "en";

export const UI_LOCALE_CONFIG = {
  en: { lang: "en", dir: "ltr", db: "EN", label: "English", nativeLabel: "English" },
  fa: { lang: "fa", dir: "rtl", db: "FA", label: "Persian", nativeLabel: "فارسی" },
} as const satisfies Record<
  UiLocale,
  {
    lang: string;
    dir: "ltr" | "rtl";
    db: PrismaUiLocale;
    label: string;
    nativeLabel: string;
  }
>;

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

export function uiLocaleFromDb(value: PrismaUiLocale | null | undefined): UiLocale {
  return value === "FA" ? "fa" : "en";
}

export function uiLocaleToDb(locale: UiLocale): PrismaUiLocale {
  return UI_LOCALE_CONFIG[locale].db;
}

export function localeDocumentAttributes(locale: UiLocale) {
  const { lang, dir } = UI_LOCALE_CONFIG[locale];
  return { lang, dir } as const;
}
