"use client";

import { useState } from "react";
import type { TranslationLanguage } from "@prisma/client";
import { VocabularyFilters } from "./VocabularyFilters";

export function VocabularyControls({
  preferredTranslation,
  current,
  partOfSpeechOptions,
  levelOptions,
  children,
}: {
  preferredTranslation: TranslationLanguage;
  current: { q: string; status: string; pos: string; level: string; relation: string; sort: string };
  partOfSpeechOptions: { value: string; label: string }[];
  levelOptions: { value: string; label: string }[];
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState(preferredTranslation);
  return (
    <>
      <VocabularyFilters
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={levelOptions}
        language={language}
        onLanguageChange={setLanguage}
      />
      <div data-vocabulary-language={language}>{children}</div>
    </>
  );
}
