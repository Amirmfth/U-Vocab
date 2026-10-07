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
      <p className="library-count vocabulary-list-count [display:flex] [align-items:baseline] [gap:6px] [margin:2px_0_0] [color:var(--text-muted)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.7rem] [&_strong]:[color:var(--text-soft)] [&_strong]:[font-size:0.8rem] [&_strong]:[font-weight:600] [margin-top:2px]">
        <strong>{formatNumber(locale, rows.length)}</strong> {t("vocab.shown")}{" "}
        <span aria-hidden="true">·</span>{" "}
        {formatNumber(locale, total)} {t("vocab.total")}
      </p>

      {rows.length ? (
        <div className="vocabulary-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
          {rows.map((row) => (
            <Link className="vocabulary-row [&:nth-child(even)]:[background:rgb(22,_22,_22)] min-[940px]:[&:hover]:[background:var(--surface)] [position:relative] [min-height:78px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [gap:8px_12px] [padding:12px_2px_13px] [border-bottom:1px_solid_var(--border)] [background:transparent] [&_.word]:[overflow:hidden] [&_.word]:[font-size:1.04rem] [&_.word]:[line-height:1.25] [&_.word]:[text-overflow:ellipsis] [&_.word]:[white-space:nowrap] [&_.mastery-line]:[grid-column:1_/_-1] [&_.mastery-line]:[height:3px] [&_.mastery-line]:[margin-top:-2px] min-[620px]:[min-height:84px] min-[620px]:[padding-inline:8px]" key={row.id} href={`/vocabulary/${row.id}`} prefetch>
              <div className="vocabulary-row-main [min-width:0]">
                <div className="word learning-content [font-size:1.35rem] [font-weight:610] [letter-spacing:-0.03em]" lang={targetLanguage} dir="ltr">
                  {row.label}
                </div>
                <div className="translation-line [display:flex] [flex-wrap:wrap] [gap:4px_10px] [color:var(--text-muted)] [font-size:0.84rem] [min-width:0] [margin-top:4px] [&_span]:[display:block] [&_span]:[overflow:hidden] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.74rem] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap]">
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
                        className={`learning-content vocabulary-translation [[data-vocabulary-language=ENGLISH]_&:not(.vocabulary-translation-en)]:[display:none] [[data-vocabulary-language=PERSIAN]_&:not(.vocabulary-translation-fa)]:[display:none] vocabulary-translation-${meaning.language}`}
                        lang={meaning.language}
                        dir={meaning.language === "fa" ? "rtl" : "ltr"}
                      >
                        {meaning.text}
                      </span>
                    ))}
                </div>
              </div>
              <div className="vocabulary-row-meta [align-items:flex-start] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [min-width:70px] [display:flex] [flex-wrap:wrap] [align-content:start] [justify-content:flex-end] [gap:4px] [color:var(--text-muted)] [font-size:0.62rem] [text-transform:lowercase] [&_strong]:[width:100%] [&_strong]:[color:var(--text-soft)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:0.66rem] [&_strong]:[font-weight:500] [&_strong]:[text-align:right]">
                <span className="vocabulary-cefr [min-width:28px] [text-align:center] [color:var(--primary-strong)] [font-weight:700] [text-transform:uppercase]">{row.cefrLevel ?? "—"}</span>
                <span>{stateKeys[row.state] ? t(stateKeys[row.state]) : row.state.toLowerCase()}</span>
                {row.isDue ? <span className="row-signal [padding:2px_5px] [border:1px_solid_var(--border)] [border-radius:999px] [background:var(--surface-raised)]">{t("vocab.due")}</span> : null}
                {row.isWeak ? <span className="row-signal [padding:2px_5px] [border:1px_solid_var(--border)] [border-radius:999px] [background:var(--surface-raised)]">{t("vocab.weak")}</span> : null}
                <strong>{formatNumber(locale, row.mastery)}%</strong>
              </div>
              <div
                className="mastery-line [height:4px] [margin-top:auto] [overflow:hidden] [border-radius:999px] [background:var(--surface-soft)] [&_span]:[display:block] [&_span]:[height:100%] [&_span]:[min-width:3px] [&_span]:[border-radius:inherit] [&_span]:[background:linear-gradient(90deg,_#6657ee,_var(--primary-strong))]"
                aria-label={t("vocab.mastery", { value: formatNumber(locale, row.mastery) })}
              >
                <span style={{ width: `${row.mastery}%` }} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <BookOpen size={22} />
          <strong>{t("vocab.noMatches")}</strong>
          <Link href="/vocabulary" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
            {t("vocab.clearFilters")}
          </Link>
        </div>
      )}
    </>
  );
}
