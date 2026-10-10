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
        <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
          <Link href="/review" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
            <ArrowLeft className="rtl-mirror" size={16} />
            {t("nav.review")}
          </Link>
          <h1>{t("rescue.title")}</h1>
        </section>

        {top.length ? (
          <>
            <section className="rescue-list flex flex-col uv-border-top-8d7f82f403">
              {top.map((item, index) => (
                <article className="rescue-row grid uv-grid-template-columns-738a8da05d gap-3 items-start uv-padding-612d1e1532 uv-border-bottom-8d7f82f403 uv-min620:items-center" key={item.id}>
                  <div className="rescue-rank uv-font-family-320794573f uv-font-variant-numeric-3032cae0ba pt-0.5 text-uv-text-muted text-uv-f78eb7000a9">
                    {formatNumber(locale, index + 1, {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    })}
                  </div>
                  <div className="rescue-row-copy min-w-0 flex flex-col gap-2 uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-0.75 uv-v1c155e3be2:text-uv-text-muted uv-v1c155e3be2:text-uv-ff1713651e0">
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
                    <div className="rescue-reasons flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-24a7c581e4 uv-v36c0309a03:uv-border-7314b293fb uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:bg-uv-c8b3083dabe uv-v36c0309a03:text-uv-c7d351e814d uv-v36c0309a03:text-uv-f78eb7000a9">
                      {item.risk.reasons.map((reason) => (
                        <span key={reason}>
                          {localizedRiskReason(reason, t, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong
                    className="rescue-score uv-font-family-320794573f uv-font-variant-numeric-3032cae0ba min-w-8.5 text-right text-uv-danger text-uv-f6c2d68ddb8"
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
                className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
              >
                <LifeBuoy size={18} />
                {t("rescue.cta", {
                  count: formatNumber(locale, rescueSet.length),
                })}
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
              <Link href="/review" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
                {t("rescue.regularReview")}
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state flex flex-col gap-3 items-start p-6 uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft">
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
