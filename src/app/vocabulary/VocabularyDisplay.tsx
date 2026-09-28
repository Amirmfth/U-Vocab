"use client";

import Link from "next/link";
import { useState } from "react";
import type { TranslationLanguage } from "@prisma/client";
import { BookOpen, Plus } from "lucide-react";
import { isTranslationVisible } from "@/lib/translations";
import { VocabularyFilters } from "./VocabularyFilters";

type VocabularyRow = {
  id: string;
  label: string;
  translations: { id: string; language: string; text: string }[];
  cefrLevel: string | null;
  state: string;
  mastery: number;
  isDue: boolean;
  isWeak: boolean;
};

export function VocabularyDisplay({
  preferredTranslation,
  rows,
  total,
  current,
  partOfSpeechOptions,
  levelOptions,
}: {
  preferredTranslation: TranslationLanguage;
  rows: VocabularyRow[];
  total: number;
  current: { q: string; status: string; pos: string; level: string; relation: string; sort: string };
  partOfSpeechOptions: { value: string; label: string }[];
  levelOptions: { value: string; label: string }[];
}) {
  const [language, setLanguage] = useState(preferredTranslation);

  return (
    <>
      <section className="page-header compact library-header">
        <h1>Vocabulary</h1>
        <Link href="/vocabulary/new" className="button button-primary" prefetch>
          <Plus size={18} />
          Add word
        </Link>
      </section>

      <VocabularyFilters
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={levelOptions}
        language={language}
        onLanguageChange={setLanguage}
      />

      <p className="library-count vocabulary-list-count">
        <strong>{rows.length}</strong> shown <span aria-hidden="true">·</span> {total} total
      </p>

      {rows.length ? (
        <div className="vocabulary-list">
          {rows.map((row) => (
            <Link className="vocabulary-row" key={row.id} href={`/vocabulary/${row.id}`} prefetch>
              <div className="vocabulary-row-main">
                <div className="word">{row.label}</div>
                <div className="translation-line">
                  {row.translations
                    .filter((translation) => isTranslationVisible(language, translation.language))
                    .slice(0, language === "BOTH" ? 2 : 1)
                    .map((translation) => (
                      <span key={translation.id} className={translation.language === "fa" ? "rtl" : undefined}>
                        {translation.text}
                      </span>
                    ))}
                </div>
              </div>
              <div className="vocabulary-row-meta">
                <span className="vocabulary-cefr">{row.cefrLevel ?? "—"}</span>
                <span>{row.state.toLowerCase()}</span>
                {row.isDue ? <span className="row-signal">due</span> : null}
                {row.isWeak ? <span className="row-signal">weak</span> : null}
                <strong>{row.mastery}%</strong>
              </div>
              <div className="mastery-line" aria-label={`Mastery ${row.mastery}%`}>
                <span style={{ width: `${row.mastery}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <BookOpen size={22} />
          <strong>No vocabulary matches these filters.</strong>
          <Link href="/vocabulary" className="button button-secondary">Clear filters</Link>
        </div>
      )}
    </>
  );
}
