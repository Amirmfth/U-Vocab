"use client";

import Link from "next/link";
import { useState } from "react";
import type { TranslationLanguage } from "@prisma/client";
import { BookOpen, Plus } from "lucide-react";
import { isTranslationVisible } from "@/lib/translations";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";
import { formatNumber } from "@/i18n/format";
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

const stateKeys: Record<string, MessageKey> = {
  NEW: "vocab.state.new",
  LEARNING: "vocab.state.learning",
  FAMILIAR: "vocab.state.familiar",
  ACTIVE: "vocab.state.active",
  MASTERED: "vocab.state.mastered",
  MAINTENANCE: "vocab.state.maintenance",
};

export function VocabularyDisplay({
  preferredTranslation,
  targetLanguage,
  rows,
  total,
  current,
  partOfSpeechOptions,
  levelOptions,
}: {
  preferredTranslation: TranslationLanguage;
  targetLanguage: "de" | "fr" | "en";
  rows: VocabularyRow[];
  total: number;
  current: { q: string; status: string; pos: string; level: string; relation: string; sort: string };
  partOfSpeechOptions: { value: string; label: string }[];
  levelOptions: { value: string; label: string }[];
}) {
  const [language, setLanguage] = useState(preferredTranslation);
  const { locale, t } = useI18n();

  return (
    <>
      <section className="page-header compact library-header">
        <h1>{t("vocab.title")}</h1>
        <Link href="/vocabulary/new" className="button button-primary" prefetch>
          <Plus size={18} />
          {t("nav.addWord")}
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
        <strong>{formatNumber(locale, rows.length)}</strong> {t("vocab.shown")}{" "}
        <span aria-hidden="true">·</span>{" "}
        {formatNumber(locale, total)} {t("vocab.total")}
      </p>

      {rows.length ? (
        <div className="vocabulary-list">
          {rows.map((row) => (
            <Link className="vocabulary-row" key={row.id} href={`/vocabulary/${row.id}`} prefetch>
              <div className="vocabulary-row-main">
                <div className="word learning-content" lang={targetLanguage} dir="ltr">
                  {row.label}
                </div>
                <div className="translation-line">
                  {row.translations
                    .filter((translation) => isTranslationVisible(language, translation.language))
                    .slice(0, language === "BOTH" ? 2 : 1)
                    .map((translation) => (
                      <span
                        key={translation.id}
                        className="learning-content"
                        lang={translation.language === "fa" ? "fa" : "en"}
                        dir={translation.language === "fa" ? "rtl" : "ltr"}
                      >
                        {translation.text}
                      </span>
                    ))}
                </div>
              </div>
              <div className="vocabulary-row-meta">
                <span className="vocabulary-cefr">{row.cefrLevel ?? "—"}</span>
                <span>{stateKeys[row.state] ? t(stateKeys[row.state]) : row.state.toLowerCase()}</span>
                {row.isDue ? <span className="row-signal">{t("vocab.due")}</span> : null}
                {row.isWeak ? <span className="row-signal">{t("vocab.weak")}</span> : null}
                <strong>{formatNumber(locale, row.mastery)}%</strong>
              </div>
              <div
                className="mastery-line"
                aria-label={t("vocab.mastery", { value: formatNumber(locale, row.mastery) })}
              >
                <span style={{ width: `${row.mastery}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <BookOpen size={22} />
          <strong>{t("vocab.noMatches")}</strong>
          <Link href="/vocabulary" className="button button-secondary">
            {t("vocab.clearFilters")}
          </Link>
        </div>
      )}
    </>
  );
}
