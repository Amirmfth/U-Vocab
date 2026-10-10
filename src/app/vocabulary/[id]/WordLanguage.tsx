"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TranslationLanguage } from "@prisma/client";
import { useTranslations } from "@/i18n/client";

type WordLanguage = "ENGLISH" | "PERSIAN";

const WordLanguageContext = createContext<{
  language: WordLanguage;
  setLanguage: (language: WordLanguage) => void;
  targetLanguageCode: "de" | "fr" | "en";
} | null>(null);

export function useWordLanguage() {
  const value = useContext(WordLanguageContext);
  if (!value) throw new Error("Word language control is missing.");
  return value;
}

export function WordLanguageProvider({
  preference,
  targetLanguageCode,
  children,
}: {
  preference: TranslationLanguage;
  targetLanguageCode: "de" | "fr" | "en";
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<WordLanguage>(
    preference === "PERSIAN" ? "PERSIAN" : "ENGLISH",
  );

  return (
    <WordLanguageContext.Provider value={{ language, setLanguage, targetLanguageCode }}>
      {children}
    </WordLanguageContext.Provider>
  );
}

export function WordLanguageSwitch() {
  const context = useContext(WordLanguageContext);
  const t = useTranslations();
  if (!context) throw new Error("Word language control is missing.");
  return (
    <div className="translation-switch inline-flex gap-0.75 p-0.75 border-1px-solid-border-2 rounded-exact-11px bg-uv-surface in-button-3:min-h-9 in-button-3:padding-0-10px in-button-3:border-0 in-button-3:rounded-exact-8px in-button-3:bg-transparent in-button-3:text-uv-text-muted in-button-3:cursor-pointer in-button-3:text-exact-0p72rem in-button-3:font-650 in-button-is-active:bg-uv-surface-soft in-button-is-active:text-uv-text in-button-disabled-2:cursor-wait in-button-disabled-2:opacity-65" aria-label={t("word.translationLanguage")}>
      {(["ENGLISH", "PERSIAN"] as const).map((mode) => (
        <button
          type="button"
          key={mode}
          className={context.language === mode ? "is-active" : ""}
          aria-pressed={context.language === mode}
          onClick={() => context.setLanguage(mode)}
        >
          {mode === "ENGLISH" ? "EN" : "FA"}
        </button>
      ))}
    </div>
  );
}

export function WordMeaning({
  translations,
  definitions,
}: {
  translations: { id: string; language: string; text: string }[];
  definitions: { id: string; language: string; text: string }[];
}) {
  const { language, targetLanguageCode } = useWordLanguage();
  const preferredCode = language === "PERSIAN" ? "fa" : "en";
  const translation = translations.find(
    (item) =>
      item.language === preferredCode &&
      item.language !== targetLanguageCode,
  );
  const definition =
    preferredCode === targetLanguageCode
      ? definitions.find((item) => item.language === targetLanguageCode)
      : null;
  const fallback =
    translation ??
    definition ??
    translations.find((item) => item.language !== targetLanguageCode) ??
    definitions.find((item) => item.language === targetLanguageCode);

  if (!fallback) return null;

  return (
    <p
      className={"word-hero-meaning flex-1-1-220px min-w-0 m-0 text-exact-clamp-1p12rem-2p7vw-1p65rem font-580 line-height-1p45 in-word-hero-meaning-fa:text-right in-word-hero-meaning-en:text-left word-hero-meaning--" + fallback.language + " learning-content"}
      dir={fallback.language === "fa" ? "rtl" : "ltr"}
      lang={fallback.language}
    >
      {fallback.text}
    </p>
  );
}

export function WordExampleMeaning({
  english,
  persian,
}: {
  english: string | null;
  persian: string | null;
}) {
  const { language, targetLanguageCode } = useWordLanguage();
  if (language === "PERSIAN") {
    return persian
      ? <p className="muted learning-content text-uv-text-muted" lang="fa" dir="rtl">{persian}</p>
      : null;
  }
  if (targetLanguageCode === "en") return null;
  return english
    ? <p className="muted learning-content text-uv-text-muted" lang="en" dir="ltr">{english}</p>
    : null;
}
