"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TranslationLanguage } from "@prisma/client";

type WordLanguage = "ENGLISH" | "PERSIAN";

const WordLanguageContext = createContext<{
  language: WordLanguage;
  setLanguage: (language: WordLanguage) => void;
} | null>(null);

export function useWordLanguage() {
  const language = useContext(WordLanguageContext);
  if (!language) throw new Error("Word language control is missing.");
  return language.language;
}

export function WordLanguageProvider({
  preference,
  children,
}: {
  preference: TranslationLanguage;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<WordLanguage>(
    preference === "PERSIAN" ? "PERSIAN" : "ENGLISH",
  );

  return (
    <WordLanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </WordLanguageContext.Provider>
  );
}

export function WordLanguageSwitch() {
  const context = useContext(WordLanguageContext);
  if (!context) throw new Error("Word language control is missing.");
  return (
      <div className="translation-switch" aria-label="Translation language">
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
}: {
  translations: { id: string; language: string; text: string }[];
}) {
  const language = useWordLanguage() === "PERSIAN" ? "fa" : "en";
  return (
    <>
      {translations.filter((translation) => translation.language === language).map((translation) => (
        <p
          key={translation.id}
          className={`word-hero-meaning word-hero-meaning--${language}`}
          dir={language === "fa" ? "rtl" : "ltr"}
          lang={language}
        >
          {translation.text}
        </p>
      ))}
    </>
  );
}

export function WordExampleMeaning({ english, persian }: { english: string | null; persian: string | null }) {
  const language = useWordLanguage();
  return language === "PERSIAN"
    ? persian ? <p className="rtl muted" lang="fa" dir="rtl">{persian}</p> : null
    : english ? <p className="muted" lang="en">{english}</p> : null;
}
