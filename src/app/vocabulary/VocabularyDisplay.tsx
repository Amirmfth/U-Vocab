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
      <p className="library-count vocabulary-list-count flex items-baseline gap-1.5 uv-margin-585df5c862 text-uv-text-muted uv-font-family-320794573f text-uv-f58b84cc6f5 uv-veda02a0adb:text-uv-text-soft uv-veda02a0adb:text-uv-f6c2d68ddb8 uv-veda02a0adb:font-semibold mt-0.5">
        <strong>{formatNumber(locale, rows.length)}</strong> {t("vocab.shown")}{" "}
        <span aria-hidden="true">·</span>{" "}
        {formatNumber(locale, total)} {t("vocab.total")}
      </p>

      {rows.length ? (
        <div className="vocabulary-list flex flex-col uv-border-top-8d7f82f403">
          {rows.map((row) => (
            <Link className="vocabulary-row uv-v4af6d61843:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative min-h-19.5 grid uv-grid-template-columns-f06dd92ea5 uv-gap-e4accf4b2b uv-padding-9e55c755a1 uv-border-bottom-8d7f82f403 bg-transparent uv-va00727a60e:overflow-hidden uv-va00727a60e:text-uv-f2862aaf96f uv-va00727a60e:uv-line-height-8e007eaa50 uv-va00727a60e:uv-text-overflow-900198081b uv-va00727a60e:whitespace-nowrap uv-vc89072ee13:uv-grid-column-93b665dfb5 uv-vc89072ee13:h-0.75 uv-vc89072ee13:-mt-0.5 uv-min620:min-h-21 uv-min620:px-2" key={row.id} href={`/vocabulary/${row.id}`} prefetch>
              <div className="vocabulary-row-main min-w-0">
                <div className="word learning-content text-uv-f3951047c34 uv-weight-610 uv-letter-spacing-60c8585fce" lang={targetLanguage} dir="ltr">
                  {row.label}
                </div>
                <div className="translation-line flex flex-wrap uv-gap-4de81a03a8 text-uv-text-muted text-uv-f8bb1a95a21 min-w-0 mt-1 uv-v36c0309a03:block uv-v36c0309a03:overflow-hidden uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f63777cce16 uv-v36c0309a03:uv-text-overflow-900198081b uv-v36c0309a03:whitespace-nowrap">
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
                        className={`learning-content vocabulary-translation uv-vae5f5d2b17:hidden uv-vaab5d43b5b:hidden vocabulary-translation-${meaning.language}`}
                        lang={meaning.language}
                        dir={meaning.language === "fa" ? "rtl" : "ltr"}
                      >
                        {meaning.text}
                      </span>
                    ))}
                </div>
              </div>
              <div className="vocabulary-row-meta items-start uv-font-family-320794573f min-w-17.5 flex flex-wrap uv-align-content-2b020927d3 justify-end gap-1 text-uv-text-muted text-uv-f174ef476a0 lowercase uv-veda02a0adb:w-full uv-veda02a0adb:text-uv-text-soft uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-ff7862da171 uv-veda02a0adb:font-medium uv-veda02a0adb:text-right">
                <span className="vocabulary-cefr min-w-7 text-center text-uv-primary-strong font-bold uppercase">{row.cefrLevel ?? "—"}</span>
                <span>{stateKeys[row.state] ? t(stateKeys[row.state]) : row.state.toLowerCase()}</span>
                {row.isDue ? <span className="row-signal uv-padding-c7c21db7c1 uv-border-8d7f82f403 rounded-uv-red9ab892c5 bg-uv-surface-raised">{t("vocab.due")}</span> : null}
                {row.isWeak ? <span className="row-signal uv-padding-c7c21db7c1 uv-border-8d7f82f403 rounded-uv-red9ab892c5 bg-uv-surface-raised">{t("vocab.weak")}</span> : null}
                <strong>{formatNumber(locale, row.mastery)}%</strong>
              </div>
              <div
                className="mastery-line h-1 mt-auto overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft uv-v36c0309a03:block uv-v36c0309a03:h-full uv-v36c0309a03:min-w-0.75 uv-v36c0309a03:rounded-uv-r3e26d67509 uv-v36c0309a03:uv-background-d8b54e70f5"
                aria-label={t("vocab.mastery", { value: formatNumber(locale, row.mastery) })}
              >
                <span style={{ width: `${row.mastery}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <BookOpen size={22} />
          <strong>{t("vocab.noMatches")}</strong>
          <Link href="/vocabulary" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
            {t("vocab.clearFilters")}
          </Link>
        </div>
      )}
    </>
  );
}
