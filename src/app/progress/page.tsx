import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Clock3, Flame, ShieldCheck, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { buildActivityDays, localDateKey } from "@/lib/progress";
import { currentRetrievability } from "@/lib/fsrs";
import { getServerTranslator } from "@/i18n/server";
import {
  formatDate,
  formatNumber,
  formatPercent,
} from "@/i18n/format";
import type { MessageKey } from "@/i18n/core";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { TimezoneSync } from "./TimezoneSync";
import { GrammarProgressPanel } from "./GrammarProgressPanel";

const RANGE_DAYS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
  all: null,
};

const rangeLabelKeys: Record<string, MessageKey> = {
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

function rangeCutoff(range: string) {
  const days = RANGE_DAYS[range] ?? 30;
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

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
  const { locale, t } = await getServerTranslator(user);
  const range = query.range && query.range in RANGE_DAYS ? query.range : "30";
  const cutoff = rangeCutoff(range);
  const activityCutoff = new Date();
  activityCutoff.setDate(activityCutoff.getDate() - 366);

  const metricAttemptWhere = cutoff
    ? { userCourseId: course.id, createdAt: { gte: cutoff } }
    : { userCourseId: course.id };
  const metricReviewWhere = cutoff
    ? {
        userVocabulary: { userCourseId: course.id },
        reviewedAt: { gte: cutoff },
      }
    : { userVocabulary: { userCourseId: course.id } };
  const metricEncounterWhere = cutoff
    ? { userCourseId: course.id, createdAt: { gte: cutoff } }
    : { userCourseId: course.id };

  const [
    vocabulary,
    metricAttempts,
    metricReviews,
    metricEncounters,
    heatAttempts,
    heatReviews,
    heatEncounters,
    activityMistakes,
    openMistakes,
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
        retrievability: true,
        fsrsCard: true,
        nextReviewAt: true,
        addedAt: true,
        masteredAt: true,
      },
    }),
    db.attempt.findMany({
      where: metricAttemptWhere,
      select: {
        createdAt: true,
        exerciseType: true,
        durationMs: true,
        correct: true,
      },
    }),
    db.review.findMany({
      where: metricReviewWhere,
      select: { reviewedAt: true, rating: true },
    }),
    db.encounter.findMany({
      where: metricEncounterWhere,
      select: { createdAt: true, source: true },
    }),
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

  const now = new Date();
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

  const totalDurationMs = metricAttempts.reduce(
    (sum, attempt) => sum + (attempt.durationMs ?? 0),
    0,
  );
  const reviewSuccess = metricReviews.length
    ? metricReviews.filter((review) => review.rating !== "AGAIN").length /
      metricReviews.length
    : 0;
  const practiceAccuracy = metricAttempts.length
    ? metricAttempts.filter((attempt) => attempt.correct).length /
      metricAttempts.length
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

  return (
    <main className="page">
      <TimezoneSync savedTimezone={user.timezone} />

      <section className="page-header compact">
        <p className="eyebrow">{t("progress.eyebrow")}</p>
        <h1>{t("progress.title")}</h1>
        <p className="page-description">{t("progress.description")}</p>
      </section>

      <nav className="range-tabs" aria-label={t("progress.range")}>
        {["7", "30", "90", "365", "all"].map((value) => (
          <Link
            key={value}
            href={"/progress?range=" + value}
            className={"range-tab " + (range === value ? "is-active" : "")}
          >
            {t(rangeLabelKeys[value])}
          </Link>
        ))}
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
          <span>{t("progress.activeEstimate")}</span>
          <strong>{formatNumber(locale, active)}</strong>
          <small>
            {t("progress.passiveDeveloping", {
              passive: formatNumber(locale, passive),
              developing: formatNumber(locale, developing),
            })}
          </small>
        </div>
        <div>
          <span>{t("progress.retention")}</span>
          <strong>{formatPercent(locale, averageRetention)}</strong>
          <small>{t("progress.retrievability")}</small>
        </div>
        <div>
          <span>{t("progress.mastered")}</span>
          <strong>{formatNumber(locale, totalMastered)}</strong>
          <small>
            {t("progress.masteredRange", {
              count: formatNumber(locale, masteredInRange),
            })}
          </small>
        </div>
      </section>

      <GrammarProgressPanel
        userId={user.id}
        userCourseId={course.id}
        currentLevel={course.currentLevel}
        targetLevel={course.targetLevel}
        locale={locale}
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
                  style={{
                    width: Math.round(averageRecognition * 100) + "%",
                  }}
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
          <div className="workload-numbers">
            <div>
              <strong>{formatNumber(locale, dueNow)}</strong>
              <span>{t("progress.dueNow")}</span>
            </div>
            <div>
              <strong>{formatNumber(locale, dueWeek)}</strong>
              <span>{t("progress.next7Days")}</span>
            </div>
            <div>
              <strong>{formatNumber(locale, metricReviews.length)}</strong>
              <span>{t("progress.reviewsRange")}</span>
            </div>
          </div>
          <p className="analytics-caveat">
            {t("progress.reviewSuccess", {
              percent: formatPercent(locale, reviewSuccess),
            })}
          </p>
        </article>

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
              count: formatNumber(locale, metricEncounters.length),
            })}
          </p>
        </article>

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
              {weakAreas.slice(0, 6).map(([type, count]) => (
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
                  style={{
                    height:
                      Math.max(3, (item.learned / maxTrend) * 100) + "%",
                  }}
                  title={t("progress.learnedTitle", {
                    count: formatNumber(locale, item.learned),
                  })}
                />
                <span
                  className="trend-bar mastered"
                  style={{
                    height:
                      Math.max(3, (item.mastered / maxTrend) * 100) + "%",
                  }}
                  title={t("progress.masteredTitle", {
                    count: formatNumber(locale, item.mastered),
                  })}
                />
              </div>
              <small>
                {formatDate(
                  locale,
                  new Date(item.month + "-01T12:00:00Z"),
                  { month: "short" },
                )}
              </small>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <span>
            <i className="trend-key learned" /> {t("progress.added")}
          </span>
          <span>
            <i className="trend-key mastered" />{" "}
            {t("progress.masteredLegend")}
          </span>
        </div>
        <p className="analytics-caveat">{t("progress.trendCaveat")}</p>
      </section>

      <section className="panel heatmap-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("progress.activity")}</p>
            <h2>{t("progress.days365")}</h2>
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
              {formatDate(
                locale,
                new Date(selectedDay + "T12:00:00Z"),
                { dateStyle: "medium" },
              )}
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
                count: formatNumber(
                  locale,
                  selectedActivity?.readingEncounters ?? 0,
                ),
              })}
            </span>
            <span>
              {t("progress.mistakesCorrected", {
                count: formatNumber(
                  locale,
                  selectedActivity?.mistakesCorrected ?? 0,
                ),
              })}
            </span>
            <span>
              {t("progress.minutes", {
                count: formatNumber(
                  locale,
                  minutes(selectedActivity?.durationMs ?? 0),
                ),
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
