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
    <div className="translation-switch [display:inline-flex] [gap:3px] [padding:3px] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface)] [&_button]:[min-height:36px] [&_button]:[padding:0_10px] [&_button]:[border:0] [&_button]:[border-radius:8px] [&_button]:[background:transparent] [&_button]:[color:var(--text-muted)] [&_button]:[cursor:pointer] [&_button]:[font-size:0.72rem] [&_button]:[font-weight:650] [&_button.is-active]:[background:var(--surface-soft)] [&_button.is-active]:[color:var(--text)] [&_button:disabled]:[cursor:wait] [&_button:disabled]:[opacity:0.65]" aria-label={t("word.translationLanguage")}>
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
      className={"word-hero-meaning [flex:1_1_220px] [min-width:0] [margin:0] [font-size:clamp(1.12rem,_2.7vw,_1.65rem)] [font-weight:580] [line-height:1.45] [&.word-hero-meaning--fa]:[text-align:right] [&.word-hero-meaning--en]:[text-align:left] word-hero-meaning--" + fallback.language + " learning-content"}
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
      ? <p className="muted learning-content [color:var(--text-muted)]" lang="fa" dir="rtl">{persian}</p>
      : null;
  }
  if (targetLanguageCode === "en") return null;
  return english
    ? <p className="muted learning-content [color:var(--text-muted)]" lang="en" dir="ltr">{english}</p>
    : null;
}
