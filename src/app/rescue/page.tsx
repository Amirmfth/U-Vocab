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
      <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
        <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem">
          <Link href="/review" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-exact-0p82rem">
            <ArrowLeft className="rtl-mirror" size={16} />
            {t("nav.review")}
          </Link>
          <h1>{t("rescue.title")}</h1>
        </section>

        {top.length ? (
          <>
            <section className="rescue-list flex flex-col border-1px-solid-border-3">
              {top.map((item, index) => (
                <article className="rescue-row grid grid-template-columns-auto-minmax-0-1fr-auto gap-3 items-start padding-14px-0 border-1px-solid-border uv-min620:items-center" key={item.id}>
                  <div className="rescue-rank font-font-geist-mono-geist-mono-monospace font-tabular-nums pt-0.5 text-uv-text-muted text-exact-0p68rem">
                    {formatNumber(locale, index + 1, {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    })}
                  </div>
                  <div className="rescue-row-copy min-w-0 flex flex-col gap-2 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-0.75 in-div-first-child-span:text-uv-text-muted in-div-first-child-span:text-exact-0p72rem">
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
                    <div className="rescue-reasons flex flex-wrap gap-1.5 in-span:padding-5px-8px in-span:border-1px-solid-rgb-255-107-122-0p18 in-span:rounded-exact-999px in-span:bg-uv-c8b3083dabe in-span:text-uv-c7d351e814d in-span:text-exact-0p68rem">
                      {item.risk.reasons.map((reason) => (
                        <span key={reason}>
                          {localizedRiskReason(reason, t, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong
                    className="rescue-score font-font-geist-mono-geist-mono-monospace font-tabular-nums min-w-8.5 text-right text-uv-danger text-exact-0p8rem"
                    title={t("rescue.score")}
                  >
                    {formatNumber(locale, Math.round(item.risk.score * 100))}
                  </strong>
                </article>
              ))}
            </section>

            <div className="progress-actions flex flex-col gap-2.25 uv-min620:flex-row">
              <Link
                href={
                  "/rescue?ids=" +
                  encodeURIComponent(
                    rescueSet.map((item) => item.id).join(","),
                  ) +
                  "&step=0"
                }
                className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
              >
                <LifeBuoy size={18} />
                {t("rescue.cta", {
                  count: formatNumber(locale, rescueSet.length),
                })}
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
              <Link href="/review" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
                {t("rescue.regularReview")}
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state flex flex-col gap-3 items-start p-6 border-1px-dashed-border-strong rounded-exact-radius-lg text-uv-text-soft">
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
