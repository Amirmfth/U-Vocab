import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Flame,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { buildActivityDays, localDateKey } from "@/lib/progress";
import {
  compareMetric,
  learningReport,
  previousPeriod,
  rangeCutoff,
  resolveProgressRange,
  type ProgressRange,
} from "@/lib/progress-analytics";
import { currentRetrievability } from "@/lib/fsrs";
import { getEntitlements } from "@/lib/entitlements/service";
import { getServerTranslator } from "@/i18n/server";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { LockedFeature } from "@/components/entitlement-primitives";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { TimezoneSync } from "./TimezoneSync";
import { GrammarProgressPanel } from "./GrammarProgressPanel";
import { PersistedFirstUseGuide } from "@/components/PersistedFirstUseGuide";
import { FIRST_USE_GUIDES } from "@/lib/first-use-guidance";

const rangeLabelKeys: Record<ProgressRange, MessageKey> = {
  "7": "progress.range.7",
  "30": "progress.range.30",
  "90": "progress.range.90",
  "365": "progress.range.365",
  all: "progress.range.all",
};

const weaknessKeys: Record<string, MessageKey> = {
  ARTICLE: "mistake.type.article",
  CASE: "mistake.type.case",
  PREPOSITION: "mistake.type.preposition",
  REFLEXIVE: "mistake.type.reflexive",
  COLLOCATION: "mistake.type.collocation",
  ADJECTIVE_ENDING: "mistake.type.adjective_ending",
  VERB_POSITION: "mistake.type.verb_position",
  WORD_ORDER: "mistake.type.word_order",
  TENSE: "mistake.type.tense",
  CONJUGATION: "mistake.type.conjugation",
  PRONOUN: "mistake.type.pronoun",
  AGREEMENT: "mistake.type.agreement",
  RELATIVE_CLAUSE: "mistake.type.relative_clause",
  PASSIVE: "mistake.type.passive",
  SUBJUNCTIVE: "mistake.type.subjunctive",
  WORD_CHOICE: "mistake.type.word_choice",
  WORD_FORM: "mistake.type.word_form",
  SPELLING: "mistake.type.spelling",
  OTHER: "mistake.type.other",
  PRODUCTION: "progress.productionWeakness",
};

const productionExerciseTypes = [
  "FREE_SENTENCE",
  "PARAPHRASE",
  "COLLOCATION",
  "CASE_PREPOSITION",
  "CONTEXTUAL_CHOICE",
] as const;

function minutes(ms: number) {
  return Math.round(ms / 60000);
}

function lastMonthKeys(todayKey: string) {
  const [year, month] = todayKey.split("-").map(Number);
  const result: string[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    result.push(date.toISOString().slice(0, 7));
  }
  return result;
}

function signedNumber(locale: "en" | "fa", value: number) {
  const formatted = formatNumber(locale, Math.abs(value));
  if (value === 0) return formatted;
  return (value > 0 ? "+" : "−") + formatted;
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; day?: string }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([
    getCurrentUser(),
    getCurrentCourse(),
    searchParams,
  ]);
  const [{ locale, t }, entitlements] = await Promise.all([
    getServerTranslator(user),
    getEntitlements(user.id),
  ]);

  const canUseAdvancedAnalytics =
    entitlements.config.features.advanced_analytics &&
    entitlements.config.features.long_history;
  const range = resolveProgressRange(query.range, canUseAdvancedAnalytics);
  const now = new Date();
  const cutoff = rangeCutoff(range, now);
  const priorPeriod = canUseAdvancedAnalytics ? previousPeriod(range, now) : null;

  const activityDaysToLoad = canUseAdvancedAnalytics ? 366 : 7;
  const activityCutoff = new Date(
    now.getTime() - activityDaysToLoad * 24 * 60 * 60 * 1000,
  );

  const metricAttemptWhere = {
    userCourseId: course.id,
    ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
  };
  const metricReviewWhere = {
    userVocabulary: { userCourseId: course.id },
    ...(cutoff ? { reviewedAt: { gte: cutoff } } : {}),
  };
  const metricEncounterWhere = {
    userCourseId: course.id,
    ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
  };

  const priorAttemptWhere = priorPeriod
    ? {
        userCourseId: course.id,
        createdAt: { gte: priorPeriod.start, lt: priorPeriod.end },
      }
    : null;
  const priorReviewWhere = priorPeriod
    ? {
        userVocabulary: { userCourseId: course.id },
        reviewedAt: { gte: priorPeriod.start, lt: priorPeriod.end },
      }
    : null;

  const [
    vocabulary,
    attemptAggregate,
    correctAttemptCount,
    productionAttemptCount,
    correctProductionAttemptCount,
    reviewCount,
    successfulReviewCount,
    encounterCount,
    heatAttempts,
    heatReviews,
    heatEncounters,
    activityMistakes,
    openMistakes,
    priorAttemptAggregate,
    priorCorrectAttemptCount,
    priorProductionAttemptCount,
    priorCorrectProductionAttemptCount,
    priorReviewCount,
    priorSuccessfulReviewCount,
  ] = await Promise.all([
    db.userVocabulary.findMany({
      where: { userCourseId: course.id },
      select: {
        id: true,
        state: true,
        recognition: true,
        meaningRecall: true,
        production: true,
        contextualUsage: true,
        stability: true,
        fsrsCard: true,
        nextReviewAt: true,
        addedAt: true,
        masteredAt: true,
      },
    }),
    db.attempt.aggregate({
      where: metricAttemptWhere,
      _sum: { durationMs: true },
      _count: { _all: true },
    }),
    db.attempt.count({
      where: { ...metricAttemptWhere, correct: true },
    }),
    db.attempt.count({
      where: {
        ...metricAttemptWhere,
        exerciseType: { in: [...productionExerciseTypes] },
      },
    }),
    db.attempt.count({
      where: {
        ...metricAttemptWhere,
        exerciseType: { in: [...productionExerciseTypes] },
        correct: true,
      },
    }),
    db.review.count({ where: metricReviewWhere }),
    db.review.count({
      where: { ...metricReviewWhere, rating: { not: "AGAIN" } },
    }),
    db.encounter.count({ where: metricEncounterWhere }),
    db.attempt.findMany({
      where: { userCourseId: course.id, createdAt: { gte: activityCutoff } },
      select: { createdAt: true, exerciseType: true, durationMs: true },
    }),
    db.review.findMany({
      where: {
        userVocabulary: { userCourseId: course.id },
        reviewedAt: { gte: activityCutoff },
      },
      select: { reviewedAt: true },
    }),
    db.encounter.findMany({
      where: { userCourseId: course.id, createdAt: { gte: activityCutoff } },
      select: { createdAt: true, source: true },
    }),
    db.mistake.findMany({
      where: {
        userCourseId: course.id,
        resolvedAt: { gte: activityCutoff },
      },
      select: { resolvedAt: true },
    }),
    db.mistake.findMany({
      where: { userCourseId: course.id, resolvedAt: null },
      select: { type: true, occurrences: true },
    }),
    priorAttemptWhere
      ? db.attempt.aggregate({
          where: priorAttemptWhere,
          _sum: { durationMs: true },
          _count: { _all: true },
        })
      : Promise.resolve(null),
    priorAttemptWhere
      ? db.attempt.count({ where: { ...priorAttemptWhere, correct: true } })
      : Promise.resolve(null),
    priorAttemptWhere
      ? db.attempt.count({
          where: {
            ...priorAttemptWhere,
            exerciseType: { in: [...productionExerciseTypes] },
          },
        })
      : Promise.resolve(null),
    priorAttemptWhere
      ? db.attempt.count({
          where: {
            ...priorAttemptWhere,
            exerciseType: { in: [...productionExerciseTypes] },
            correct: true,
          },
        })
      : Promise.resolve(null),
    priorReviewWhere
      ? db.review.count({ where: priorReviewWhere })
      : Promise.resolve(null),
    priorReviewWhere
      ? db.review.count({
          where: { ...priorReviewWhere, rating: { not: "AGAIN" } },
        })
      : Promise.resolve(null),
  ]);

  const active = vocabulary.filter(
    (item) => item.production >= 0.55 && item.contextualUsage >= 0.5,
  ).length;
  const passive = vocabulary.filter(
    (item) =>
      !(item.production >= 0.55 && item.contextualUsage >= 0.5) &&
      (item.recognition >= 0.5 || item.meaningRecall >= 0.5),
  ).length;
  const developing = Math.max(0, vocabulary.length - active - passive);

  const averageRecognition = vocabulary.length
    ? vocabulary.reduce((sum, item) => sum + item.recognition, 0) /
      vocabulary.length
    : 0;
  const averageProduction = vocabulary.length
    ? vocabulary.reduce((sum, item) => sum + item.production, 0) /
      vocabulary.length
    : 0;

  const currentRetrievabilities = vocabulary
    .filter((item) => item.fsrsCard)
    .map((item) => currentRetrievability(item.fsrsCard));
  const averageRetention = currentRetrievabilities.length
    ? currentRetrievabilities.reduce((sum, value) => sum + value, 0) /
      currentRetrievabilities.length
    : 0;

  const learnedInRange = vocabulary.filter(
    (item) => !cutoff || item.addedAt >= cutoff,
  ).length;
  const masteredInRange = vocabulary.filter(
    (item) => item.masteredAt && (!cutoff || item.masteredAt >= cutoff),
  ).length;
  const totalMastered = vocabulary.filter(
    (item) => item.state === "MASTERED" || item.state === "MAINTENANCE",
  ).length;
  const learningCount = Math.max(0, vocabulary.length - totalMastered);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dueNow = vocabulary.filter(
    (item) => !item.nextReviewAt || item.nextReviewAt <= now,
  ).length;
  const dueWeek = vocabulary.filter(
    (item) =>
      item.nextReviewAt &&
      item.nextReviewAt > now &&
      item.nextReviewAt <= nextWeek,
  ).length;

  const totalDurationMs = attemptAggregate._sum.durationMs ?? 0;
  const reviewSuccess = reviewCount
    ? successfulReviewCount / reviewCount
    : 0;
  const practiceAccuracy = attemptAggregate._count._all
    ? correctAttemptCount / attemptAggregate._count._all
    : 0;
  const productionSuccess = productionAttemptCount
    ? correctProductionAttemptCount / productionAttemptCount
    : 0;

  const weaknessMap = new Map<string, number>();
  for (const mistake of openMistakes) {
    weaknessMap.set(
      mistake.type,
      (weaknessMap.get(mistake.type) ?? 0) + mistake.occurrences,
    );
  }
  const lowProductionCount = vocabulary.filter(
    (item) => item.production < 0.4,
  ).length;
  if (lowProductionCount) weaknessMap.set("PRODUCTION", lowProductionCount);
  const weakAreas = Array.from(weaknessMap.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const activityDays = buildActivityDays({
    timeZone: user.timezone,
    attempts: heatAttempts,
    reviews: heatReviews,
    encounters: heatEncounters,
    vocabulary: vocabulary.filter((item) => item.addedAt >= activityCutoff),
    mistakes: activityMistakes,
  });
  const today = localDateKey(now, user.timezone);
  const selectedDay = query.day ?? today;
  const selectedActivity = activityDays.find(
    (day) => day.date === selectedDay,
  );

  const monthKeys = lastMonthKeys(today);
  const monthlyTrend = monthKeys.map((month) => ({
    month,
    learned: vocabulary.filter(
      (item) =>
        localDateKey(item.addedAt, user.timezone).slice(0, 7) === month,
    ).length,
    mastered: vocabulary.filter(
      (item) =>
        item.masteredAt &&
        localDateKey(item.masteredAt, user.timezone).slice(0, 7) === month,
    ).length,
  }));
  const maxTrend = Math.max(
    1,
    ...monthlyTrend.map((item) => Math.max(item.learned, item.mastered)),
  );

  const priorLearned = priorPeriod
    ? vocabulary.filter(
        (item) =>
          item.addedAt >= priorPeriod.start && item.addedAt < priorPeriod.end,
      ).length
    : 0;
  const priorMastered = priorPeriod
    ? vocabulary.filter(
        (item) =>
          item.masteredAt &&
          item.masteredAt >= priorPeriod.start &&
          item.masteredAt < priorPeriod.end,
      ).length
    : 0;
  const priorDurationMs = priorAttemptAggregate?._sum.durationMs ?? 0;
  const priorReviewSuccess =
    priorReviewCount && priorSuccessfulReviewCount !== null
      ? priorSuccessfulReviewCount / priorReviewCount
      : 0;
  const priorProductionSuccess =
    priorProductionAttemptCount && priorCorrectProductionAttemptCount !== null
      ? priorCorrectProductionAttemptCount / priorProductionAttemptCount
      : 0;

  const comparisons = priorPeriod
    ? {
        learned: compareMetric(learnedInRange, priorLearned),
        mastered: compareMetric(masteredInRange, priorMastered),
        practiceMinutes: compareMetric(minutes(totalDurationMs), minutes(priorDurationMs)),
        reviewSuccess: compareMetric(reviewSuccess, priorReviewSuccess),
        productionSuccess: compareMetric(productionSuccess, priorProductionSuccess),
      }
    : null;

  const report = learningReport({
    recognition: averageRecognition,
    production: averageProduction,
    retention: averageRetention,
    dueNow,
    topWeakness: weakAreas[0]?.[0] ?? null,
    masteredDelta: comparisons?.mastered.delta ?? null,
  });

  const reportLabel = (value: string) => {
    if (value === "recognition") return t("progress.recognition");
    if (value === "production") return t("progress.production");
    if (value === "retention") return t("progress.retention");
    if (value === "reviews") return t("progress.reviewQueue");
    if (value === "practice") return t("progress.activePractice");
    if (value === "mastery") return t("progress.mastered");
    if (value === "steady") return t("progress.report.steady");
    if (value === "none") return t("progress.report.noMajorWeakness");
    return weaknessKeys[value]
      ? t(weaknessKeys[value])
      : value.replaceAll("_", " ").toLowerCase();
  };

  return (
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <TimezoneSync savedTimezone={user.timezone} />
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.progress}
        title={t("guidance.progress.title")}
        description={t("guidance.progress.body")}
        items={[t("guidance.progress.item1")]}
        dismissLabel={t("guidance.dismiss")}
      />

      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.eyebrow")}</p>
        <h1>{t("progress.title")}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("progress.description")}</p>
      </section>

      <nav className="range-tabs w-fit max-w-full flex gap-1 overflow-x-auto p-0.75 uv-border-8d7f82f403 rounded-uv-r0939007802 bg-uv-surface" aria-label={t("progress.range")}>
        {(["7", "30", "90", "365", "all"] as ProgressRange[]).map((value) =>
          canUseAdvancedAnalytics || value === "7" ? (
            <Link
              key={value}
              href={"/progress?range=" + value}
              className={"range-tab min-w-12 min-h-9.5 grid uv-place-items-305047e96e uv-padding-4d5c65a39c rounded-uv-r22be94e0a1 text-uv-text-muted text-uv-f74fc13de71 font-semibold whitespace-nowrap uv-v14ef0811e9:bg-uv-surface-soft uv-v14ef0811e9:text-uv-text uv-v33850dc841:uv-grid-auto-flow-aa60230ab0 uv-v33850dc841:gap-1.5 uv-v33850dc841:cursor-not-allowed uv-v33850dc841:opacity-72 uv-v271612ab88:text-uv-fd95043f679 uv-v271612ab88:font-bold uv-v271612ab88:uv-letter-spacing-a3adac5ce9 uv-v271612ab88:uppercase " + (range === value ? "is-active" : "")}
              aria-current={range === value ? "page" : undefined}
            >
              {t(rangeLabelKeys[value])}
            </Link>
          ) : (
            <span
              key={value}
              className="range-tab is-locked min-w-12 min-h-9.5 grid uv-place-items-305047e96e uv-padding-4d5c65a39c rounded-uv-r22be94e0a1 text-uv-text-muted text-uv-f74fc13de71 font-semibold whitespace-nowrap uv-v14ef0811e9:bg-uv-surface-soft uv-v14ef0811e9:text-uv-text uv-v33850dc841:uv-grid-auto-flow-aa60230ab0 uv-v33850dc841:gap-1.5 uv-v33850dc841:cursor-not-allowed uv-v33850dc841:opacity-72 uv-v271612ab88:text-uv-fd95043f679 uv-v271612ab88:font-bold uv-v271612ab88:uv-letter-spacing-a3adac5ce9 uv-v271612ab88:uppercase"
              aria-label={t("progress.proRangeLocked", {
                range: t(rangeLabelKeys[value]),
              })}
            >
              {t(rangeLabelKeys[value])}
              <small>{t("plan.pro")}</small>
            </span>
          ),
        )}
      </nav>

      <section className="progress-summary grid uv-grid-template-columns-dd0b1a1848 uv-border-8d7f82f403 rounded-uv-r02a0a889dd overflow-hidden uv-vcbb57f4d35:min-w-0 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-1 uv-vcbb57f4d35:uv-padding-13f34872df uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-v3de32a793f:uv-border-right-8d7f82f403 uv-v3f0a529921:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f58b84cc6f5 uv-v36c0309a03:uv-line-height-ec0a69ff34 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-f58b84cc6f5 uv-v982220ddd5:uv-line-height-ec0a69ff34 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:uv-font-variant-numeric-3032cae0ba uv-veda02a0adb:text-uv-f52dd23ea8f uv-veda02a0adb:uv-letter-spacing-52201352dd uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-vcbb57f4d35:uv-border-bottom-b6589fc6ab uv-min620:uv-v3f0a529921:uv-border-bottom-b6589fc6ab uv-min620:uv-v3de32a793f:uv-border-right-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403">
        <div>
          <span>{t("progress.vocabulary")}</span>
          <strong>{formatNumber(locale, vocabulary.length)}</strong>
          <small>
            {t("progress.addedRange", {
              count: formatNumber(locale, learnedInRange),
            })}
          </small>
        </div>
        <div>
          <span>{t("progress.mastered")}</span>
          <strong>{formatNumber(locale, totalMastered)}</strong>
          <small>
            {t("progress.learningCount", {
              count: formatNumber(locale, learningCount),
            })}
          </small>
        </div>
        <div>
          <span>{t("progress.retention")}</span>
          <strong>{formatPercent(locale, averageRetention)}</strong>
          <small>{t("progress.retrievability")}</small>
        </div>
        <div>
          <span>{t("progress.dueReviews")}</span>
          <strong>{formatNumber(locale, dueNow)}</strong>
          <small>{t("progress.dueNow")}</small>
        </div>
      </section>

      <GrammarProgressPanel
        userId={user.id}
        userCourseId={course.id}
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
        locale={locale}
        compact={!canUseAdvancedAnalytics}
      />

      <section className="progress-grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min620:uv-grid-template-columns-dd0b1a1848">
        <article className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.skillBalance")}</p>
              <h2>{t("progress.recognitionProduction")}</h2>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="progress-bars flex flex-col gap-3.75 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-1.75 uv-v36c0309a03:flex uv-v36c0309a03:justify-between uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-fe9d5fd6635 uv-vad81a304ad:text-uv-text-soft uv-vad81a304ad:uv-font-family-320794573f">
            <div>
              <span>
                {t("progress.recognition")}{" "}
                <b>{formatPercent(locale, averageRecognition)}</b>
              </span>
              <div className="metric-bar h-1.75 overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft uv-v22810335d8:block uv-v22810335d8:h-full uv-v22810335d8:rounded-uv-r3e26d67509 uv-v22810335d8:bg-uv-primary">
                <span
                  style={{ width: Math.round(averageRecognition * 100) + "%" }}
                />
              </div>
            </div>
            <div>
              <span>
                {t("progress.production")}{" "}
                <b>{formatPercent(locale, averageProduction)}</b>
              </span>
              <div className="metric-bar h-1.75 overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft uv-v22810335d8:block uv-v22810335d8:h-full uv-v22810335d8:rounded-uv-r3e26d67509 uv-v22810335d8:bg-uv-primary">
                <span
                  style={{ width: Math.round(averageProduction * 100) + "%" }}
                />
              </div>
            </div>
          </div>
          <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">{t("progress.estimateCaveat")}</p>
        </article>

        <article className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.workload")}</p>
              <h2>{t("progress.reviewQueue")}</h2>
            </div>
            <Clock3 size={19} />
          </div>
          <div className={"workload-numbers uv-vf08df4920a:uv-grid-template-columns-6a5c4d4d49 uv-v91ab2e2d13:uv-border-left-b6589fc6ab grid uv-grid-template-columns-563355decf uv-border-top-8d7f82f403 uv-border-bottom-8d7f82f403 uv-vcbb57f4d35:min-w-0 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-1 uv-vcbb57f4d35:uv-padding-7841f3c20a uv-v5007062a75:uv-border-left-8d7f82f403 uv-veda02a0adb:text-uv-f3951047c34 uv-veda02a0adb:uv-font-variant-numeric-3032cae0ba uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-fe22288a701 " + (!canUseAdvancedAnalytics ? "is-free" : "")}>
            <div>
              <strong>{formatNumber(locale, dueNow)}</strong>
              <span>{t("progress.dueNow")}</span>
            </div>
            {canUseAdvancedAnalytics ? (
              <>
                <div>
                  <strong>{formatNumber(locale, dueWeek)}</strong>
                  <span>{t("progress.next7Days")}</span>
                </div>
                <div>
                  <strong>{formatNumber(locale, reviewCount)}</strong>
                  <span>{t("progress.reviewsRange")}</span>
                </div>
              </>
            ) : null}
          </div>
          <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">
            {canUseAdvancedAnalytics
              ? t("progress.reviewSuccess", {
                  percent: formatPercent(locale, reviewSuccess),
                })
              : t("progress.freeWorkloadCaveat")}
          </p>
        </article>

        {canUseAdvancedAnalytics ? (
          <article className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
            <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
              <div>
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.time")}</p>
                <h2>{t("progress.activePractice")}</h2>
              </div>
              <Flame size={19} />
            </div>
            <p className="big-metric uv-font-family-320794573f uv-font-variant-numeric-3032cae0ba uv-margin-41866770f5 text-uv-fad6b4ffcf8 uv-line-height-33493e5f53 uv-letter-spacing-5d34879886">
              {t("progress.minutes", {
                count: formatNumber(locale, minutes(totalDurationMs)),
              })}
            </p>
            <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">
              {t("progress.practiceAccuracy", {
                percent: formatPercent(locale, practiceAccuracy),
                count: formatNumber(locale, encounterCount),
              })}
            </p>
          </article>
        ) : null}

        <article className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.weakAreas")}</p>
              <h2>{t("progress.needsWork")}</h2>
            </div>
            <ShieldCheck size={19} />
          </div>
          {weakAreas.length ? (
            <div className="weakness-list flex flex-col uv-vcbb57f4d35:min-h-10.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-vaff5733806:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-veda02a0adb:text-uv-text-muted uv-veda02a0adb:uv-font-family-320794573f">
              {weakAreas
                .slice(0, canUseAdvancedAnalytics ? 6 : 3)
                .map(([type, count]) => (
                  <div key={type}>
                    <span>
                      {weaknessKeys[type]
                        ? t(weaknessKeys[type])
                        : type.replaceAll("_", " ").toLowerCase()}
                    </span>
                    <strong>{formatNumber(locale, count)}</strong>
                  </div>
                ))}
            </div>
          ) : (
            <p className="muted text-uv-text-muted">{t("progress.noWeakness")}</p>
          )}
        </article>
      </section>

      {!canUseAdvancedAnalytics ? (
        <LockedFeature
          title={t("progress.pro.title")}
          description={t("progress.pro.description")}
          upgradeLabel={t("progress.pro.upgrade")}
        />
      ) : (
        <>
          {comparisons ? (
            <section className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
              <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
                <div>
                  <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.comparison.eyebrow")}</p>
                  <h2>{t("progress.comparison.title")}</h2>
                </div>
                <TrendingUp size={19} />
              </div>
              <div className="weakness-list flex flex-col uv-vcbb57f4d35:min-h-10.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-vaff5733806:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-veda02a0adb:text-uv-text-muted uv-veda02a0adb:uv-font-family-320794573f">
                <div>
                  <span>{t("progress.comparison.wordsAdded")}</span>
                  <strong>{signedNumber(locale, comparisons.learned.delta)}</strong>
                </div>
                <div>
                  <span>{t("progress.comparison.mastered")}</span>
                  <strong>{signedNumber(locale, comparisons.mastered.delta)}</strong>
                </div>
                <div>
                  <span>{t("progress.comparison.practiceTime")}</span>
                  <strong>
                    {signedNumber(locale, comparisons.practiceMinutes.delta)} {t("progress.comparison.minutesUnit")}
                  </strong>
                </div>
                <div>
                  <span>{t("progress.comparison.reviewSuccess")}</span>
                  <strong>
                    {formatPercent(locale, comparisons.reviewSuccess.current)} →{" "}
                    {formatPercent(locale, comparisons.reviewSuccess.previous)}
                  </strong>
                </div>
                <div>
                  <span>{t("progress.comparison.productionSuccess")}</span>
                  <strong>
                    {formatPercent(locale, comparisons.productionSuccess.current)} →{" "}
                    {formatPercent(locale, comparisons.productionSuccess.previous)}
                  </strong>
                </div>
              </div>
              <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">{t("progress.comparison.caveat")}</p>
            </section>
          ) : null}

          <section className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
            <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
              <div>
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.report.eyebrow")}</p>
                <h2>{t("progress.report.title")}</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="weakness-list flex flex-col uv-vcbb57f4d35:min-h-10.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-border-bottom-8d7f82f403 uv-vaff5733806:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-veda02a0adb:text-uv-text-muted uv-veda02a0adb:uv-font-family-320794573f">
              <div>
                <span>{t("progress.report.strongest")}</span>
                <strong>{reportLabel(report.strongest)}</strong>
              </div>
              <div>
                <span>{t("progress.report.weakness")}</span>
                <strong>{reportLabel(report.highestImpactWeakness)}</strong>
              </div>
              <div>
                <span>{t("progress.report.improvement")}</span>
                <strong>{reportLabel(report.recentImprovement)}</strong>
              </div>
              <div>
                <span>{t("progress.report.next")}</span>
                <strong>{reportLabel(report.suggestedNext)}</strong>
              </div>
            </div>
            <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">{t("progress.report.caveat")}</p>
          </section>

          <section className="panel progress-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 min-w-0 rounded-uv-r6d27d54c6c">
            <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
              <div>
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.growth")}</p>
                <h2>{t("progress.trend")}</h2>
              </div>
            </div>
            <div className="trend-chart h-37.5 grid uv-grid-template-columns-099132f0c9 gap-1.25 items-end pt-3 overflow-x-auto" aria-label={t("progress.trendAria")}>
              {monthlyTrend.map((item) => (
                <div className="trend-month h-full min-w-5 grid uv-grid-template-rows-f06dd92ea5 gap-1.5 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-fd95043f679 uv-v982220ddd5:text-center" key={item.month}>
                  <div className="trend-bars h-full flex items-end justify-center gap-0.5">
                    <span
                      className="trend-bar learned uv-width-53ed35ab81 min-h-0.75 rounded-uv-rce83e44a7d uv-v6fdb4efa47:bg-uv-primary uv-v432f644386:bg-uv-success"
                      style={{ height: Math.max(3, (item.learned / maxTrend) * 100) + "%" }}
                      title={t("progress.learnedTitle", {
                        count: formatNumber(locale, item.learned),
                      })}
                    />
                    <span
                      className="trend-bar mastered uv-width-53ed35ab81 min-h-0.75 rounded-uv-rce83e44a7d uv-v6fdb4efa47:bg-uv-primary uv-v432f644386:bg-uv-success"
                      style={{ height: Math.max(3, (item.mastered / maxTrend) * 100) + "%" }}
                      title={t("progress.masteredTitle", {
                        count: formatNumber(locale, item.mastered),
                      })}
                    />
                  </div>
                  <small>
                    {formatDate(locale, new Date(item.month + "-01T12:00:00Z"), {
                      month: "short",
                    })}
                  </small>
                </div>
              ))}
            </div>
            <div className="trend-legend flex gap-3.5 mt-2.5 text-uv-text-muted text-uv-f78eb7000a9 uv-v36c0309a03:inline-flex uv-v36c0309a03:items-center uv-v36c0309a03:gap-1.5">
              <span>
                <i className="trend-key learned uv-v6fdb4efa47:bg-uv-primary uv-v432f644386:bg-uv-success w-2 h-2 rounded-uv-ra0179b92f3" /> {t("progress.added")}
              </span>
              <span>
                <i className="trend-key mastered uv-v6fdb4efa47:bg-uv-primary uv-v432f644386:bg-uv-success w-2 h-2 rounded-uv-ra0179b92f3" /> {t("progress.masteredLegend")}
              </span>
            </div>
            <p className="analytics-caveat uv-margin-897443304a text-uv-text-muted text-uv-f58b84cc6f5 uv-line-height-aa8f289ebe">{t("progress.trendCaveat")}</p>
          </section>
        </>
      )}

      <section className="panel heatmap-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 overflow-hidden rounded-uv-r6d27d54c6c">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("progress.activity")}</p>
            <h2>
              {canUseAdvancedAnalytics
                ? t("progress.days365")
                : t("progress.days7")}
            </h2>
          </div>
          <span className="muted text-uv-text-muted">{user.timezone}</span>
        </div>

        <ActivityHeatmap
          days={activityDays}
          today={today}
          selectedDay={selectedDay}
          range={range}
          locale={locale}
          dayCount={canUseAdvancedAnalytics ? 365 : 7}
        />

        <div className="day-detail flex flex-col gap-2.5 pt-3.5 uv-border-top-8d7f82f403 uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-0.75 uv-v1c155e3be2:text-uv-text-muted uv-v1c155e3be2:text-uv-f58b84cc6f5 uv-min620:flex-row uv-min620:justify-between uv-min620:items-center">
          <div>
            <strong>
              {formatDate(locale, new Date(selectedDay + "T12:00:00Z"), {
                dateStyle: "medium",
              })}
            </strong>
            <span>
              {selectedActivity
                ? t("progress.activityRecorded")
                : t("progress.noActivity")}
            </span>
          </div>
          <div className="day-detail-metrics flex flex-wrap gap-1.5 uv-v36c0309a03:uv-padding-24a7c581e4 uv-v36c0309a03:uv-border-8d7f82f403 uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f78eb7000a9">
            <span>
              {t("progress.reviewed", {
                count: formatNumber(locale, selectedActivity?.reviewed ?? 0),
              })}
            </span>
            <span>
              {t("progress.learned", {
                count: formatNumber(locale, selectedActivity?.learned ?? 0),
              })}
            </span>
            <span>
              {t("progress.produced", {
                count: formatNumber(locale, selectedActivity?.produced ?? 0),
              })}
            </span>
            <span>
              {t("progress.readingEncounters", {
                count: formatNumber(locale, selectedActivity?.readingEncounters ?? 0),
              })}
            </span>
            <span>
              {t("progress.mistakesCorrected", {
                count: formatNumber(locale, selectedActivity?.mistakesCorrected ?? 0),
              })}
            </span>
            <span>
              {t("progress.minutes", {
                count: formatNumber(locale, minutes(selectedActivity?.durationMs ?? 0)),
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="progress-actions flex flex-col gap-2.25 uv-min620:flex-row">
        <Link href="/rescue" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
          {t("progress.rescueWeak")}{" "}
          <ArrowRight className="rtl-mirror" size={17} />
        </Link>
        <Link href="/mistakes" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
          {t("progress.reviewMistakes")}
        </Link>
      </section>
    </main>
  );
}
