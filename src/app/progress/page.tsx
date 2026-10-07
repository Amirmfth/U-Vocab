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
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <TimezoneSync savedTimezone={user.timezone} />
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.progress}
        title={t("guidance.progress.title")}
        description={t("guidance.progress.body")}
        items={[t("guidance.progress.item1")]}
        dismissLabel={t("guidance.dismiss")}
      />

      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.eyebrow")}</p>
        <h1>{t("progress.title")}</h1>
        <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("progress.description")}</p>
      </section>

      <nav className="range-tabs [width:fit-content] [max-width:100%] [display:flex] [gap:4px] [overflow-x:auto] [padding:3px] [border:1px_solid_var(--border)] [border-radius:12px] [background:var(--surface)]" aria-label={t("progress.range")}>
        {(["7", "30", "90", "365", "all"] as ProgressRange[]).map((value) =>
          canUseAdvancedAnalytics || value === "7" ? (
            <Link
              key={value}
              href={"/progress?range=" + value}
              className={"range-tab [min-width:48px] [min-height:38px] [display:grid] [place-items:center] [padding:0_10px] [border-radius:9px] [color:var(--text-muted)] [font-size:0.76rem] [font-weight:600] [white-space:nowrap] [&.is-active]:[background:var(--surface-soft)] [&.is-active]:[color:var(--text)] [&.is-locked]:[grid-auto-flow:column] [&.is-locked]:[gap:6px] [&.is-locked]:[cursor:not-allowed] [&.is-locked]:[opacity:0.72] [&.is-locked_small]:[font-size:0.58rem] [&.is-locked_small]:[font-weight:700] [&.is-locked_small]:[letter-spacing:0.04em] [&.is-locked_small]:[text-transform:uppercase] " + (range === value ? "is-active" : "")}
              aria-current={range === value ? "page" : undefined}
            >
              {t(rangeLabelKeys[value])}
            </Link>
          ) : (
            <span
              key={value}
              className="range-tab is-locked [min-width:48px] [min-height:38px] [display:grid] [place-items:center] [padding:0_10px] [border-radius:9px] [color:var(--text-muted)] [font-size:0.76rem] [font-weight:600] [white-space:nowrap] [&.is-active]:[background:var(--surface-soft)] [&.is-active]:[color:var(--text)] [&.is-locked]:[grid-auto-flow:column] [&.is-locked]:[gap:6px] [&.is-locked]:[cursor:not-allowed] [&.is-locked]:[opacity:0.72] [&.is-locked_small]:[font-size:0.58rem] [&.is-locked_small]:[font-weight:700] [&.is-locked_small]:[letter-spacing:0.04em] [&.is-locked_small]:[text-transform:uppercase]"
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

      <section className="progress-summary [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)] [overflow:hidden] [&_>_div]:[min-width:0] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:4px] [&_>_div]:[padding:15px_13px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:nth-child(odd)]:[border-right:1px_solid_var(--border)] [&_>_div:nth-last-child(-n_+_2)]:[border-bottom:0] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.7rem] [&_span]:[line-height:1.35] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.7rem] [&_small]:[line-height:1.35] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-variant-numeric:tabular-nums] [&_strong]:[font-size:1.55rem] [&_strong]:[letter-spacing:-0.05em] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div]:[border-bottom:0] min-[620px]:[&_>_div:nth-last-child(-n_+_2)]:[border-bottom:0] min-[620px]:[&_>_div:nth-child(odd)]:[border-right:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]">
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

      <section className="progress-grid [display:grid] [grid-template-columns:1fr] [gap:12px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
        <article className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.skillBalance")}</p>
              <h2>{t("progress.recognitionProduction")}</h2>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="progress-bars [display:flex] [flex-direction:column] [gap:15px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:7px] [&_span]:[display:flex] [&_span]:[justify-content:space-between] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.78rem] [&_b]:[color:var(--text-soft)] [&_b]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
            <div>
              <span>
                {t("progress.recognition")}{" "}
                <b>{formatPercent(locale, averageRecognition)}</b>
              </span>
              <div className="metric-bar [height:7px] [overflow:hidden] [border-radius:999px] [background:var(--surface-soft)] [&_>_span]:[display:block] [&_>_span]:[height:100%] [&_>_span]:[border-radius:inherit] [&_>_span]:[background:var(--primary)]">
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
              <div className="metric-bar [height:7px] [overflow:hidden] [border-radius:999px] [background:var(--surface-soft)] [&_>_span]:[display:block] [&_>_span]:[height:100%] [&_>_span]:[border-radius:inherit] [&_>_span]:[background:var(--primary)]">
                <span
                  style={{ width: Math.round(averageProduction * 100) + "%" }}
                />
              </div>
            </div>
          </div>
          <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">{t("progress.estimateCaveat")}</p>
        </article>

        <article className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.workload")}</p>
              <h2>{t("progress.reviewQueue")}</h2>
            </div>
            <Clock3 size={19} />
          </div>
          <div className={"workload-numbers [&.is-free]:[grid-template-columns:1fr] [&.is-free_>_div_+_div]:[border-left:0] [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [border-top:1px_solid_var(--border)] [border-bottom:1px_solid_var(--border)] [&_>_div]:[min-width:0] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:4px] [&_>_div]:[padding:13px_8px] [&_>_div_+_div]:[border-left:1px_solid_var(--border)] [&_strong]:[font-size:1.35rem] [&_strong]:[font-variant-numeric:tabular-nums] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.67rem] " + (!canUseAdvancedAnalytics ? "is-free" : "")}>
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
          <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">
            {canUseAdvancedAnalytics
              ? t("progress.reviewSuccess", {
                  percent: formatPercent(locale, reviewSuccess),
                })
              : t("progress.freeWorkloadCaveat")}
          </p>
        </article>

        {canUseAdvancedAnalytics ? (
          <article className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
            <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
              <div>
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.time")}</p>
                <h2>{t("progress.activePractice")}</h2>
              </div>
              <Flame size={19} />
            </div>
            <p className="big-metric [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-variant-numeric:tabular-nums] [margin:12px_0_2px] [font-size:clamp(2rem,_10vw,_3.4rem)] [line-height:0.95] [letter-spacing:-0.07em]">
              {t("progress.minutes", {
                count: formatNumber(locale, minutes(totalDurationMs)),
              })}
            </p>
            <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">
              {t("progress.practiceAccuracy", {
                percent: formatPercent(locale, practiceAccuracy),
                count: formatNumber(locale, encounterCount),
              })}
            </p>
          </article>
        ) : null}

        <article className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.weakAreas")}</p>
              <h2>{t("progress.needsWork")}</h2>
            </div>
            <ShieldCheck size={19} />
          </div>
          {weakAreas.length ? (
            <div className="weakness-list [display:flex] [flex-direction:column] [&_>_div]:[min-height:42px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_strong]:[color:var(--text-muted)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
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
            <p className="muted [color:var(--text-muted)]">{t("progress.noWeakness")}</p>
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
            <section className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
              <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
                <div>
                  <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.comparison.eyebrow")}</p>
                  <h2>{t("progress.comparison.title")}</h2>
                </div>
                <TrendingUp size={19} />
              </div>
              <div className="weakness-list [display:flex] [flex-direction:column] [&_>_div]:[min-height:42px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_strong]:[color:var(--text-muted)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
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
              <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">{t("progress.comparison.caveat")}</p>
            </section>
          ) : null}

          <section className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
            <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
              <div>
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.report.eyebrow")}</p>
                <h2>{t("progress.report.title")}</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="weakness-list [display:flex] [flex-direction:column] [&_>_div]:[min-height:42px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[border-bottom:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_strong]:[color:var(--text-muted)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace]">
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
            <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">{t("progress.report.caveat")}</p>
          </section>

          <section className="panel progress-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [min-width:0] [border-radius:18px]">
            <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
              <div>
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.growth")}</p>
                <h2>{t("progress.trend")}</h2>
              </div>
            </div>
            <div className="trend-chart [height:150px] [display:grid] [grid-template-columns:repeat(12,_minmax(18px,_1fr))] [gap:5px] [align-items:end] [padding-top:12px] [overflow-x:auto]" aria-label={t("progress.trendAria")}>
              {monthlyTrend.map((item) => (
                <div className="trend-month [height:100%] [min-width:20px] [display:grid] [grid-template-rows:minmax(0,_1fr)_auto] [gap:6px] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.58rem] [&_small]:[text-align:center]" key={item.month}>
                  <div className="trend-bars [height:100%] [display:flex] [align-items:end] [justify-content:center] [gap:2px]">
                    <span
                      className="trend-bar learned [width:min(8px,_45%)] [min-height:3px] [border-radius:4px_4px_1px_1px] [&.learned]:[background:var(--primary)] [&.mastered]:[background:var(--success)]"
                      style={{ height: Math.max(3, (item.learned / maxTrend) * 100) + "%" }}
                      title={t("progress.learnedTitle", {
                        count: formatNumber(locale, item.learned),
                      })}
                    />
                    <span
                      className="trend-bar mastered [width:min(8px,_45%)] [min-height:3px] [border-radius:4px_4px_1px_1px] [&.learned]:[background:var(--primary)] [&.mastered]:[background:var(--success)]"
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
            <div className="trend-legend [display:flex] [gap:14px] [margin-top:10px] [color:var(--text-muted)] [font-size:0.68rem] [&_span]:[display:inline-flex] [&_span]:[align-items:center] [&_span]:[gap:6px]">
              <span>
                <i className="trend-key learned [&.learned]:[background:var(--primary)] [&.mastered]:[background:var(--success)] [width:8px] [height:8px] [border-radius:2px]" /> {t("progress.added")}
              </span>
              <span>
                <i className="trend-key mastered [&.learned]:[background:var(--primary)] [&.mastered]:[background:var(--success)] [width:8px] [height:8px] [border-radius:2px]" /> {t("progress.masteredLegend")}
              </span>
            </div>
            <p className="analytics-caveat [margin:14px_0_0] [color:var(--text-muted)] [font-size:0.7rem] [line-height:1.5]">{t("progress.trendCaveat")}</p>
          </section>
        </>
      )}

      <section className="panel heatmap-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [overflow:hidden] [border-radius:18px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("progress.activity")}</p>
            <h2>
              {canUseAdvancedAnalytics
                ? t("progress.days365")
                : t("progress.days7")}
            </h2>
          </div>
          <span className="muted [color:var(--text-muted)]">{user.timezone}</span>
        </div>

        <ActivityHeatmap
          days={activityDays}
          today={today}
          selectedDay={selectedDay}
          range={range}
          locale={locale}
          dayCount={canUseAdvancedAnalytics ? 365 : 7}
        />

        <div className="day-detail [display:flex] [flex-direction:column] [gap:10px] [padding-top:14px] [border-top:1px_solid_var(--border)] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:3px] [&_>_div:first-child_span]:[color:var(--text-muted)] [&_>_div:first-child_span]:[font-size:0.7rem] min-[620px]:[flex-direction:row] min-[620px]:[justify-content:space-between] min-[620px]:[align-items:center]">
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
          <div className="day-detail-metrics [display:flex] [flex-wrap:wrap] [gap:6px] [&_span]:[padding:5px_8px] [&_span]:[border:1px_solid_var(--border)] [&_span]:[border-radius:999px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.68rem]">
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

      <section className="progress-actions [display:flex] [flex-direction:column] [gap:9px] min-[620px]:[flex-direction:row]">
        <Link href="/rescue" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
          {t("progress.rescueWeak")}{" "}
          <ArrowRight className="rtl-mirror" size={17} />
        </Link>
        <Link href="/mistakes" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
          {t("progress.reviewMistakes")}
        </Link>
      </section>
    </main>
  );
}
