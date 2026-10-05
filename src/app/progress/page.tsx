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
    <main className="page">
      <TimezoneSync savedTimezone={user.timezone} />
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.progress}
        title={t("guidance.progress.title")}
        description={t("guidance.progress.body")}
        items={[t("guidance.progress.item1")]}
        dismissLabel={t("guidance.dismiss")}
      />

      <section className="page-header compact">
        <p className="eyebrow">{t("progress.eyebrow")}</p>
        <h1>{t("progress.title")}</h1>
        <p className="page-description">{t("progress.description")}</p>
      </section>

      <nav className="range-tabs" aria-label={t("progress.range")}>
        {(["7", "30", "90", "365", "all"] as ProgressRange[]).map((value) =>
          canUseAdvancedAnalytics || value === "7" ? (
            <Link
              key={value}
              href={"/progress?range=" + value}
              className={"range-tab " + (range === value ? "is-active" : "")}
              aria-current={range === value ? "page" : undefined}
            >
              {t(rangeLabelKeys[value])}
            </Link>
          ) : (
            <span
              key={value}
              className="range-tab is-locked"
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

      <section className="progress-summary">
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

      <section className="progress-grid">
        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("progress.skillBalance")}</p>
              <h2>{t("progress.recognitionProduction")}</h2>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="progress-bars">
            <div>
              <span>
                {t("progress.recognition")}{" "}
                <b>{formatPercent(locale, averageRecognition)}</b>
              </span>
              <div className="metric-bar">
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
              <div className="metric-bar">
                <span
                  style={{ width: Math.round(averageProduction * 100) + "%" }}
                />
              </div>
            </div>
          </div>
          <p className="analytics-caveat">{t("progress.estimateCaveat")}</p>
        </article>

        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("progress.workload")}</p>
              <h2>{t("progress.reviewQueue")}</h2>
            </div>
            <Clock3 size={19} />
          </div>
          <div className={"workload-numbers " + (!canUseAdvancedAnalytics ? "is-free" : "")}>
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
          <p className="analytics-caveat">
            {canUseAdvancedAnalytics
              ? t("progress.reviewSuccess", {
                  percent: formatPercent(locale, reviewSuccess),
                })
              : t("progress.freeWorkloadCaveat")}
          </p>
        </article>

        {canUseAdvancedAnalytics ? (
          <article className="panel progress-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("progress.time")}</p>
                <h2>{t("progress.activePractice")}</h2>
              </div>
              <Flame size={19} />
            </div>
            <p className="big-metric">
              {t("progress.minutes", {
                count: formatNumber(locale, minutes(totalDurationMs)),
              })}
            </p>
            <p className="analytics-caveat">
              {t("progress.practiceAccuracy", {
                percent: formatPercent(locale, practiceAccuracy),
                count: formatNumber(locale, encounterCount),
              })}
            </p>
          </article>
        ) : null}

        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("progress.weakAreas")}</p>
              <h2>{t("progress.needsWork")}</h2>
            </div>
            <ShieldCheck size={19} />
          </div>
          {weakAreas.length ? (
            <div className="weakness-list">
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
            <p className="muted">{t("progress.noWeakness")}</p>
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
            <section className="panel progress-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t("progress.comparison.eyebrow")}</p>
                  <h2>{t("progress.comparison.title")}</h2>
                </div>
                <TrendingUp size={19} />
              </div>
              <div className="weakness-list">
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
              <p className="analytics-caveat">{t("progress.comparison.caveat")}</p>
            </section>
          ) : null}

          <section className="panel progress-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("progress.report.eyebrow")}</p>
                <h2>{t("progress.report.title")}</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="weakness-list">
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
            <p className="analytics-caveat">{t("progress.report.caveat")}</p>
          </section>

          <section className="panel progress-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("progress.growth")}</p>
                <h2>{t("progress.trend")}</h2>
              </div>
            </div>
            <div className="trend-chart" aria-label={t("progress.trendAria")}>
              {monthlyTrend.map((item) => (
                <div className="trend-month" key={item.month}>
                  <div className="trend-bars">
                    <span
                      className="trend-bar learned"
                      style={{ height: Math.max(3, (item.learned / maxTrend) * 100) + "%" }}
                      title={t("progress.learnedTitle", {
                        count: formatNumber(locale, item.learned),
                      })}
                    />
                    <span
                      className="trend-bar mastered"
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
            <div className="trend-legend">
              <span>
                <i className="trend-key learned" /> {t("progress.added")}
              </span>
              <span>
                <i className="trend-key mastered" /> {t("progress.masteredLegend")}
              </span>
            </div>
            <p className="analytics-caveat">{t("progress.trendCaveat")}</p>
          </section>
        </>
      )}

      <section className="panel heatmap-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("progress.activity")}</p>
            <h2>
              {canUseAdvancedAnalytics
                ? t("progress.days365")
                : t("progress.days7")}
            </h2>
          </div>
          <span className="muted">{user.timezone}</span>
        </div>

        <ActivityHeatmap
          days={activityDays}
          today={today}
          selectedDay={selectedDay}
          range={range}
          locale={locale}
        />

        <div className="day-detail">
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
          <div className="day-detail-metrics">
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

      <section className="progress-actions">
        <Link href="/rescue" className="button button-primary">
          {t("progress.rescueWeak")}{" "}
          <ArrowRight className="rtl-mirror" size={17} />
        </Link>
        <Link href="/mistakes" className="button button-secondary">
          {t("progress.reviewMistakes")}
        </Link>
      </section>
    </main>
  );
}
