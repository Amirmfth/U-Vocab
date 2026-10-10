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
      <p className="library-count vocabulary-list-count flex items-baseline gap-1.5 margin-2px-0-0 text-uv-text-muted font-font-geist-mono-geist-mono-monospace text-exact-0p7rem in-strong-2:text-uv-text-soft in-strong-2:text-exact-0p8rem in-strong-2:font-semibold mt-0.5">
        <strong>{formatNumber(locale, rows.length)}</strong> {t("vocab.shown")}{" "}
        <span aria-hidden="true">·</span>{" "}
        {formatNumber(locale, total)} {t("vocab.total")}
      </p>

      {rows.length ? (
        <div className="vocabulary-list flex flex-col border-1px-solid-border-3">
          {rows.map((row) => (
            <Link className="vocabulary-row in-nth-child-even:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative min-h-19.5 grid grid-template-columns-minmax-0-1fr-auto gap-8px-12px padding-12px-2px-13px border-1px-solid-border bg-transparent in-word:overflow-hidden in-word:text-exact-1p04rem in-word:line-height-1p25 in-word:text-overflow-ellipsis in-word:whitespace-nowrap in-mastery-line:grid-column-1-1 in-mastery-line:h-0.75 in-mastery-line:-mt-0.5 uv-min620:min-h-21 uv-min620:px-2" key={row.id} href={`/vocabulary/${row.id}`} prefetch>
              <div className="vocabulary-row-main min-w-0">
                <div className="word learning-content text-exact-1p35rem font-610 letter-spacing-0p03em" lang={targetLanguage} dir="ltr">
                  {row.label}
                </div>
                <div className="translation-line flex flex-wrap gap-4px-10px text-uv-text-muted text-exact-0p84rem min-w-0 mt-1 in-span:block in-span:overflow-hidden in-span:text-uv-text-muted in-span:text-exact-0p74rem in-span:text-overflow-ellipsis in-span:whitespace-nowrap">
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
                        className={`learning-content vocabulary-translation in-data-vocabulary-language-english-not-vocabulary-transla:hidden in-data-vocabulary-language-persian-not-vocabulary-transla:hidden vocabulary-translation-${meaning.language}`}
                        lang={meaning.language}
                        dir={meaning.language === "fa" ? "rtl" : "ltr"}
                      >
                        {meaning.text}
                      </span>
                    ))}
                </div>
              </div>
              <div className="vocabulary-row-meta items-start font-font-geist-mono-geist-mono-monospace min-w-17.5 flex flex-wrap align-content-start justify-end gap-1 text-uv-text-muted text-exact-0p62rem lowercase in-strong-2:w-full in-strong-2:text-uv-text-soft in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-0p66rem in-strong-2:font-medium in-strong-2:text-right">
                <span className="vocabulary-cefr min-w-7 text-center text-uv-primary-strong font-bold uppercase">{row.cefrLevel ?? "—"}</span>
                <span>{stateKeys[row.state] ? t(stateKeys[row.state]) : row.state.toLowerCase()}</span>
                {row.isDue ? <span className="row-signal padding-2px-5px border-1px-solid-border-2 rounded-exact-999px bg-uv-surface-raised">{t("vocab.due")}</span> : null}
                {row.isWeak ? <span className="row-signal padding-2px-5px border-1px-solid-border-2 rounded-exact-999px bg-uv-surface-raised">{t("vocab.weak")}</span> : null}
                <strong>{formatNumber(locale, row.mastery)}%</strong>
              </div>
              <div
                className="mastery-line h-1 mt-auto overflow-hidden rounded-exact-999px bg-uv-surface-soft in-span:block in-span:h-full in-span:min-w-0.75 in-span:rounded-exact-inherit in-span:bg-linear-gradient-90deg-hex-6657ee-primary-strong"
                aria-label={t("vocab.mastery", { value: formatNumber(locale, row.mastery) })}
              >
                <span style={{ width: `${row.mastery}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-exact-radius-lg text-uv-text-soft p-4.25">
          <BookOpen size={22} />
          <strong>{t("vocab.noMatches")}</strong>
          <Link href="/vocabulary" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
            {t("vocab.clearFilters")}
          </Link>
        </div>
      )}
    </>
  );
}
