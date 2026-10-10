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
    <div className="translation-switch inline-flex gap-0.75 p-0.75 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface uv-v513a7112a0:min-h-9 uv-v513a7112a0:uv-padding-4d5c65a39c uv-v513a7112a0:border-0 uv-v513a7112a0:rounded-uv-r9bc5fefa1a uv-v513a7112a0:bg-transparent uv-v513a7112a0:text-uv-text-muted uv-v513a7112a0:cursor-pointer uv-v513a7112a0:text-uv-ff1713651e0 uv-v513a7112a0:uv-weight-650 uv-v169acfe1bb:bg-uv-surface-soft uv-v169acfe1bb:text-uv-text uv-v2497b722ae:cursor-wait uv-v2497b722ae:opacity-65" aria-label={t("word.translationLanguage")}>
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
      className={"word-hero-meaning uv-flex-5c1e62cd55 min-w-0 m-0 text-uv-f4ecc9f8683 uv-weight-580 uv-line-height-2792cf2449 uv-v36d7f56673:text-right uv-v17d7ee9feb:text-left word-hero-meaning--" + fallback.language + " learning-content"}
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
