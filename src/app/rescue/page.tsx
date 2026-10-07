import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getRescueWords } from "@/lib/rescue";
import { buildExercise } from "@/lib/exercises/build";
import { selectReviewExerciseType } from "@/lib/exercises/review-select";
import { visibleLexicalMeanings } from "@/lib/lexical-meaning";
import { targetLanguageConfig } from "@/lib/languages";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber, formatPercent } from "@/i18n/format";
import type { Translator } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";
import { RescueSession } from "./RescueSession";
import type { RescueSessionCard } from "./RescueCard";

function localizedRiskReason(
  reason: string,
  t: Translator,
  locale: UiLocale,
) {
  if (reason === "low FSRS retrievability") {
    return t("rescue.reason.lowRetrievability");
  }
  if (reason === "review is overdue") {
    return t("rescue.reason.overdue");
  }
  if (reason === "low stability") {
    return t("rescue.reason.lowStability");
  }

  const failureMatch = reason.match(/^(\d+) recent failed retrievals?$/u);
  if (failureMatch) {
    const count = Number(failureMatch[1]);
    return t.plural(
      {
        one: "rescue.reason.failure.one",
        other: "rescue.reason.failure.other",
      },
      count,
      { count: formatNumber(locale, count) },
    );
  }

  return reason;
}

export default async function RescuePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; step?: string }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([
    getCurrentUser(),
    getCurrentCourse(),
    searchParams,
  ]);
  const { locale, t } = await getServerTranslator(user);
  const targetLanguageCode = targetLanguageConfig(course.targetLanguage).code;
  const requestedIds = Array.from(
    new Set(query.ids?.split(",").filter(Boolean) ?? []),
  ).slice(0, 20);
  const ranked = await getRescueWords(user.id, course.id, 100, requestedIds);

  if (!query.ids) {
    const top = ranked.slice(0, 20);
    const rescueSet = top.slice(0, 10);

    return (
      <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
        <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
          <Link href="/review" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
            <ArrowLeft className="rtl-mirror" size={16} />
            {t("nav.review")}
          </Link>
          <h1>{t("rescue.title")}</h1>
        </section>

        {top.length ? (
          <>
            <section className="rescue-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
              {top.map((item, index) => (
                <article className="rescue-row [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [gap:12px] [align-items:start] [padding:14px_0] [border-bottom:1px_solid_var(--border)] min-[620px]:[align-items:center]" key={item.id}>
                  <div className="rescue-rank [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-variant-numeric:tabular-nums] [padding-top:2px] [color:var(--text-muted)] [font-size:0.68rem]">
                    {formatNumber(locale, index + 1, {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    })}
                  </div>
                  <div className="rescue-row-copy [min-width:0] [display:flex] [flex-direction:column] [gap:8px] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:3px] [&_>_div:first-child_span]:[color:var(--text-muted)] [&_>_div:first-child_span]:[font-size:0.72rem]">
                    <div>
                      <strong
                        className="learning-content"
                        lang={targetLanguageCode}
                        dir="ltr"
                      >
                        {formatLexemeLabel(item.lexeme)}
                      </strong>
                      <span>
                        {t("rescue.retrievable", {
                          percent: formatPercent(
                            locale,
                            item.risk.retrievability,
                          ),
                        })}
                      </span>
                    </div>
                    <div className="rescue-reasons [display:flex] [flex-wrap:wrap] [gap:6px] [&_span]:[padding:5px_8px] [&_span]:[border:1px_solid_rgba(255,_107,_122,_0.18)] [&_span]:[border-radius:999px] [&_span]:[background:var(--danger-soft)] [&_span]:[color:#ffc2c9] [&_span]:[font-size:0.68rem]">
                      {item.risk.reasons.map((reason) => (
                        <span key={reason}>
                          {localizedRiskReason(reason, t, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong
                    className="rescue-score [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-variant-numeric:tabular-nums] [min-width:34px] [text-align:right] [color:var(--danger)] [font-size:0.8rem]"
                    title={t("rescue.score")}
                  >
                    {formatNumber(locale, Math.round(item.risk.score * 100))}
                  </strong>
                </article>
              ))}
            </section>

            <div className="progress-actions [display:flex] [flex-direction:column] [gap:9px] min-[620px]:[flex-direction:row]">
              <Link
                href={
                  "/rescue?ids=" +
                  encodeURIComponent(
                    rescueSet.map((item) => item.id).join(","),
                  ) +
                  "&step=0"
                }
                className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
              >
                <LifeBuoy size={18} />
                {t("rescue.cta", {
                  count: formatNumber(locale, rescueSet.length),
                })}
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
              <Link href="/review" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
                {t("rescue.regularReview")}
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [padding:24px] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)]">
            <CheckCircle2 size={22} />
            <strong>{t("rescue.none")}</strong>
            <span>{t("rescue.noneHelp")}</span>
          </div>
        )}
      </main>
    );
  }

  const byId = new Map(ranked.map((item) => [item.id, item]));
  const cards: Array<RescueSessionCard | null> = requestedIds.map((id) => {
    const item = byId.get(id);
    if (!item) return null;
    const exerciseType = selectReviewExerciseType(
      {
        recognition: item.recognition,
        meaningRecall: item.meaningRecall,
        production: item.production,
        contextualUsage: item.contextualUsage,
        mistakeTypes: item.lexeme.mistakes.map((mistake) => mistake.type),
      },
      [],
    );
    return {
      userVocabularyId: item.id,
      lemma: item.lexeme.lemma,
      article: item.lexeme.article,
      translations: visibleLexicalMeanings(
        item.lexeme,
        course.explanationLanguage,
      ).map(({ language, text }) => ({ language, text })),
      exercise: buildExercise(
        exerciseType,
        item.lexeme,
        course.explanationLanguage,
      ),
      targetLanguage: targetLanguageCode,
      riskPercent: Math.round(item.risk.score * 100),
      reasons: item.risk.reasons.length
        ? item.risk.reasons.map((reason) =>
            localizedRiskReason(reason, t, locale),
          )
        : [t("rescue.reason.lowConfidence")],
    };
  });
  const requestedStep = Number(query.step ?? 0);
  const initialStep = Number.isFinite(requestedStep)
    ? Math.min(cards.length, Math.max(0, Math.floor(requestedStep)))
    : 0;

  return <RescueSession cards={cards} initialStep={initialStep} />;
}
