import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { MessageKey, Translator } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";

type VocabularyRow = {
  id: string;
  label: string;
  meanings: { id: string; language: string; text: string; kind: "translation" | "definition" }[];
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
  targetLanguage,
  rows,
  total,
  locale,
  t,
}: {
  targetLanguage: "de" | "fr" | "en";
  rows: VocabularyRow[];
  total: number;
  locale: UiLocale;
  t: Translator;
}) {

  return (
    <>
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
                  {row.meanings
                    .filter((meaning, index, meanings) =>
                      meanings.findIndex((candidate) =>
                        candidate.language === meaning.language &&
                        candidate.kind === meaning.kind
                      ) === index,
                    )
                    .map((meaning) => (
                      <span
                        key={meaning.id}
                        className={`learning-content vocabulary-translation vocabulary-translation-${meaning.language}`}
                        lang={meaning.language}
                        dir={meaning.language === "fa" ? "rtl" : "ltr"}
                      >
                        {meaning.text}
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
