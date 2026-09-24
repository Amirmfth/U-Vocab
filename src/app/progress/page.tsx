import Link from "next/link";
import { ArrowRight, Clock3, Flame, ShieldCheck, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildActivityDays, localDateKey } from "@/lib/progress";
import { currentRetrievability } from "@/lib/fsrs";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { TimezoneSync } from "./TimezoneSync";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
  all: null,
};

function rangeCutoff(range: string) {
  const days = RANGE_DAYS[range] ?? 30;
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function percent(value: number) {
  return Math.round(value * 100);
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
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const range = query.range && query.range in RANGE_DAYS ? query.range : "30";
  const cutoff = rangeCutoff(range);
  const activityCutoff = new Date();
  activityCutoff.setDate(activityCutoff.getDate() - 366);

  const metricAttemptWhere = cutoff ? { userId: user.id, createdAt: { gte: cutoff } } : { userId: user.id };
  const metricReviewWhere = cutoff
    ? { userVocabulary: { userId: user.id }, reviewedAt: { gte: cutoff } }
    : { userVocabulary: { userId: user.id } };
  const metricEncounterWhere = cutoff ? { userId: user.id, createdAt: { gte: cutoff } } : { userId: user.id };

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
    topicPacks,
  ] = await Promise.all([
    db.userVocabulary.findMany({
      where: { userId: user.id },
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
      where: { userId: user.id, createdAt: { gte: activityCutoff } },
      select: { createdAt: true, exerciseType: true, durationMs: true },
    }),
    db.review.findMany({
      where: {
        userVocabulary: { userId: user.id },
        reviewedAt: { gte: activityCutoff },
      },
      select: { reviewedAt: true },
    }),
    db.encounter.findMany({
      where: { userId: user.id, createdAt: { gte: activityCutoff } },
      select: { createdAt: true, source: true },
    }),
    db.mistake.findMany({
      where: {
        userId: user.id,
        resolvedAt: { gte: activityCutoff },
      },
      select: { resolvedAt: true },
    }),
    db.mistake.findMany({
      where: { userId: user.id, resolvedAt: null },
      select: { type: true, occurrences: true },
    }),
    db.topicPack.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            lexeme: {
              include: {
                userStates: {
                  where: { userId: user.id },
                  select: { state: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
    ? vocabulary.reduce((sum, item) => sum + item.recognition, 0) / vocabulary.length
    : 0;
  const averageProduction = vocabulary.length
    ? vocabulary.reduce((sum, item) => sum + item.production, 0) / vocabulary.length
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

  const weaknessMap = new Map<string, number>();
  for (const mistake of openMistakes) {
    weaknessMap.set(
      mistake.type,
      (weaknessMap.get(mistake.type) ?? 0) + mistake.occurrences,
    );
  }
  const lowProductionCount = vocabulary.filter((item) => item.production < 0.4).length;
  if (lowProductionCount) weaknessMap.set("PRODUCTION", lowProductionCount);
  const weakAreas = Array.from(weaknessMap.entries()).sort((a, b) => b[1] - a[1]);

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
  const selectedActivity = activityDays.find((day) => day.date === selectedDay);

  const monthKeys = lastMonthKeys(today);
  const monthlyTrend = monthKeys.map((month) => ({
    month,
    learned: vocabulary.filter(
      (item) => localDateKey(item.addedAt, user.timezone).slice(0, 7) === month,
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

  const topicCoverage = topicPacks.map((pack) => {
    const covered = pack.items.filter((item) => {
      const state = item.lexeme.userStates[0]?.state;
      return state && state !== "NEW";
    }).length;
    return {
      id: pack.id,
      title: pack.title,
      covered,
      total: pack.items.length,
    };
  });

  return (
    <main className="page">
      <TimezoneSync savedTimezone={user.timezone} />

      <section className="page-header compact">
        <p className="eyebrow">PROGRESS</p>
        <h1>Learning analytics</h1>
        <p className="page-description">
          Based on your actual reviews, attempts, encounters, and learner state.
        </p>
      </section>

      <nav className="range-tabs" aria-label="Analytics time range">
        {[
          ["7", "7d"],
          ["30", "30d"],
          ["90", "90d"],
          ["365", "1y"],
          ["all", "All"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={"/progress?range=" + value}
            className={"range-tab " + (range === value ? "is-active" : "")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="progress-summary">
        <div>
          <span>Vocabulary</span>
          <strong>{vocabulary.length}</strong>
          <small>{learnedInRange} added in range</small>
        </div>
        <div>
          <span>Active estimate</span>
          <strong>{active}</strong>
          <small>{passive} passive · {developing} developing</small>
        </div>
        <div>
          <span>Retention</span>
          <strong>{percent(averageRetention)}%</strong>
          <small>Current FSRS retrievability</small>
        </div>
        <div>
          <span>Mastered</span>
          <strong>{totalMastered}</strong>
          <small>{masteredInRange} reached mastery in range</small>
        </div>
      </section>

      <section className="progress-grid">
        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SKILL BALANCE</p>
              <h2>Recognition vs production</h2>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="progress-bars">
            <div>
              <span>Recognition <b>{percent(averageRecognition)}%</b></span>
              <div className="metric-bar"><span style={{ width: percent(averageRecognition) + "%" }} /></div>
            </div>
            <div>
              <span>Production <b>{percent(averageProduction)}%</b></span>
              <div className="metric-bar"><span style={{ width: percent(averageProduction) + "%" }} /></div>
            </div>
          </div>
          <p className="analytics-caveat">
            Active/passive counts are estimates from mastery dimensions, not a language certification.
          </p>
        </article>

        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORKLOAD</p>
              <h2>Review queue</h2>
            </div>
            <Clock3 size={19} />
          </div>
          <div className="workload-numbers">
            <div><strong>{dueNow}</strong><span>due now</span></div>
            <div><strong>{dueWeek}</strong><span>next 7 days</span></div>
            <div><strong>{metricReviews.length}</strong><span>reviews in range</span></div>
          </div>
          <p className="analytics-caveat">
            {percent(reviewSuccess)}% of reviews in this range were graded Hard, Good, or Easy.
          </p>
        </article>

        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TIME</p>
              <h2>Active practice</h2>
            </div>
            <Flame size={19} />
          </div>
          <p className="big-metric">{minutes(totalDurationMs)} min</p>
          <p className="analytics-caveat">
            Measured from review/practice interactions. Timing starts with the progress telemetry migration.
          </p>
        </article>

        <article className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WEAK AREAS</p>
              <h2>What needs work</h2>
            </div>
            <ShieldCheck size={19} />
          </div>
          {weakAreas.length ? (
            <div className="weakness-list">
              {weakAreas.slice(0, 6).map(([type, count]) => (
                <div key={type}>
                  <span>{type.replaceAll("_", " ").toLowerCase()}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No unresolved weakness patterns.</p>
          )}
        </article>
      </section>

      <section className="panel progress-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GROWTH</p>
            <h2>12-month learning trend</h2>
          </div>
        </div>
        <div className="trend-chart" aria-label="Words learned and mastered by month">
          {monthlyTrend.map((item) => (
            <div className="trend-month" key={item.month}>
              <div className="trend-bars">
                <span
                  className="trend-bar learned"
                  style={{ height: Math.max(3, (item.learned / maxTrend) * 100) + "%" }}
                  title={item.learned + " learned"}
                />
                <span
                  className="trend-bar mastered"
                  style={{ height: Math.max(3, (item.mastered / maxTrend) * 100) + "%" }}
                  title={item.mastered + " mastered"}
                />
              </div>
              <small>{item.month.slice(5)}</small>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <span><i className="trend-key learned" /> added</span>
          <span><i className="trend-key mastered" /> mastered</span>
        </div>
        <p className="analytics-caveat">
          Mastery transition history starts with the progress telemetry migration; older mastered items are included in current totals but cannot be backdated precisely.
        </p>
      </section>

      <section className="panel heatmap-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACTIVITY</p>
            <h2>365 days</h2>
          </div>
          <span className="muted">{user.timezone}</span>
        </div>

        <ActivityHeatmap
          days={activityDays}
          today={today}
          selectedDay={selectedDay}
          range={range}
        />

        <div className="day-detail">
          <div>
            <strong>{selectedDay}</strong>
            <span>{selectedActivity ? "Activity recorded" : "No activity"}</span>
          </div>
          <div className="day-detail-metrics">
            <span>{selectedActivity?.reviewed ?? 0} reviewed</span>
            <span>{selectedActivity?.learned ?? 0} learned</span>
            <span>{selectedActivity?.produced ?? 0} produced</span>
            <span>{selectedActivity?.readingEncounters ?? 0} reading encounters</span>
            <span>{selectedActivity?.mistakesCorrected ?? 0} mistakes corrected</span>
            <span>{minutes(selectedActivity?.durationMs ?? 0)} min</span>
          </div>
        </div>
      </section>

      {topicCoverage.length ? (
        <section className="panel progress-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TOPIC COVERAGE</p>
              <h2>Saved packs</h2>
            </div>
          </div>
          <div className="topic-coverage-list">
            {topicCoverage.map((topic) => {
              const coverage = topic.total ? topic.covered / topic.total : 0;
              return (
                <Link href={"/topic-packs/" + topic.id} key={topic.id} className="topic-coverage-row">
                  <div>
                    <strong>{topic.title}</strong>
                    <span>{topic.covered} / {topic.total} beyond new</span>
                  </div>
                  <div className="metric-bar"><span style={{ width: percent(coverage) + "%" }} /></div>
                </Link>
              );
            })}
          </div>
          <p className="analytics-caveat">
            Topic coverage reflects your saved packs. U-Vocab does not infer official CEFR certification from these metrics.
          </p>
        </section>
      ) : null}

      <section className="progress-actions">
        <Link href="/rescue" className="button button-primary">
          Rescue weak words <ArrowRight size={17} />
        </Link>
        <Link href="/mistakes" className="button button-secondary">
          Review mistakes
        </Link>
      </section>
    </main>
  );
}
