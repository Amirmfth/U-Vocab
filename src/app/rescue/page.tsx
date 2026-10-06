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
      <main className="page">
        <section className="page-header compact">
          <Link href="/review" className="back-link">
            <ArrowLeft className="rtl-mirror" size={16} />
            {t("nav.review")}
          </Link>
          <h1>{t("rescue.title")}</h1>
        </section>

        {top.length ? (
          <>
            <section className="rescue-list">
              {top.map((item, index) => (
                <article className="rescue-row" key={item.id}>
                  <div className="rescue-rank">
                    {formatNumber(locale, index + 1, {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    })}
                  </div>
                  <div className="rescue-row-copy">
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
                    <div className="rescue-reasons">
                      {item.risk.reasons.map((reason) => (
                        <span key={reason}>
                          {localizedRiskReason(reason, t, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong
                    className="rescue-score"
                    title={t("rescue.score")}
                  >
                    {formatNumber(locale, Math.round(item.risk.score * 100))}
                  </strong>
                </article>
              ))}
            </section>

            <div className="progress-actions">
              <Link
                href={
                  "/rescue?ids=" +
                  encodeURIComponent(
                    rescueSet.map((item) => item.id).join(","),
                  ) +
                  "&step=0"
                }
                className="button button-primary"
              >
                <LifeBuoy size={18} />
                {t("rescue.cta", {
                  count: formatNumber(locale, rescueSet.length),
                })}
                <ArrowRight className="rtl-mirror" size={17} />
              </Link>
              <Link href="/review" className="button button-secondary">
                {t("rescue.regularReview")}
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state">
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
