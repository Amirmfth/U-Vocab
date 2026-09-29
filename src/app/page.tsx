import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Plus,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { startOperation } from "@/lib/performance";
import { connection } from "next/server";
import { getCachedHomeStats } from "@/lib/cached-data";
import { db } from "@/lib/db";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import { LearningText } from "@/i18n/learning-content";
import {
  getGrammarRecommendation,
  grammarRecommendationActionHref,
} from "@/lib/grammar/recommendations";

export default async function Home() {
  await connection();
  const perf = startOperation("page.home");
  const [user, course] = await Promise.all([
    perf.span("auth", () => getCurrentUser()),
    perf.span("course", () => getCurrentCourse()),
  ]);
  const { locale, t } = await getServerTranslator(user);
  const [{ total, due, weakProduction, mistakes, recent, today }, grammarRecommendation] =
    await Promise.all([
      perf.span("dbRead", () => getCachedHomeStats(user.id, course.id, user.timezone)),
      perf.span("grammarRecommendation", () =>
        getGrammarRecommendation(db, {
          userId: user.id,
          userCourseId: course.id,
          targetLanguage: course.targetLanguage,
          currentLevel: course.currentLevel,
          targetLevel: course.targetLevel,
        }),
      ),
    ]);

  perf.success({
    totalWords: total,
    dueWords: due,
    openMistakes: mistakes,
    grammarRecommendationReason: grammarRecommendation?.reasonCode,
  });

  const nextHref =
    due > 0
      ? "/review"
      : mistakes > 0
        ? "/mistakes"
        : weakProduction > 0
          ? "/rescue"
          : "/practice";
  const nextLabel =
    due > 0
      ? t("home.startReview")
      : mistakes > 0
        ? t("home.fixMistakes")
        : weakProduction > 0
          ? t("home.rescueWeak")
          : t("home.choosePractice");

  const dueLabel = t.plural(
    { one: "home.wordsDue.one", other: "home.wordsDue.other" },
    due,
    { count: formatNumber(locale, due) },
  );

  return (
    <main className="page">
      <section className="home-focus">
        <p className="home-kicker">{t("home.today")}</p>
        <h1>{due > 0 ? dueLabel : t("home.caughtUp")}</h1>
        <p className="page-description">
          {due > 0
            ? t("home.descDue")
            : mistakes > 0
              ? t("home.descMistakes")
              : t("home.descClear")}
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href={nextHref}>
            {nextLabel}
            <ArrowRight className="rtl-mirror" size={18} />
          </Link>
          <Link className="button button-secondary" href="/vocabulary/new">
            <Plus size={18} /> {t("nav.addWord")}
          </Link>
        </div>
      </section>

      {recent ? (
        <section className="panel home-continue">
          <div>
            <p className="eyebrow">{t("home.continue")}</p>
            <h2>{recent.label}</h2>
            <p className="muted">{recent.detail}</p>
          </div>
          <Link href={recent.href} className="button button-secondary">
            {t("common.continue")} <ArrowRight className="rtl-mirror" size={17} />
          </Link>
        </section>
      ) : null}

      {grammarRecommendation ? (
        <section className="panel home-continue">
          <div>
            <p className="eyebrow">
              {t("home.grammar")} · {grammarRecommendation.reasonCode.replaceAll("_", " ")}
            </p>
            <LearningText language="en" className="block">
              <h2>{grammarRecommendation.title}</h2>
            </LearningText>
            <p className="muted">
              {grammarRecommendation.level} · {grammarRecommendation.reason}
            </p>
          </div>
          <div className="button-row">
            <Link
              href={grammarRecommendationActionHref({
                conceptId: grammarRecommendation.conceptId,
                reasonCode: grammarRecommendation.reasonCode,
                surface: "home",
                action: "learn",
              })}
              className="button button-secondary"
            >
              {t("home.learn")}
            </Link>
            <Link
              href={grammarRecommendationActionHref({
                conceptId: grammarRecommendation.conceptId,
                reasonCode: grammarRecommendation.reasonCode,
                surface: "home",
                action: "practice",
              })}
              className="button button-primary"
            >
              {t("nav.practice")} <ArrowRight className="rtl-mirror" size={17} />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="home-today-activity" aria-label={t("home.activity")}>
        <div><strong>{formatNumber(locale, today.minutes)}</strong><span>{t("home.minutes")}</span></div>
        <div><strong>{formatNumber(locale, today.reviews)}</strong><span>{t("home.reviewed")}</span></div>
        <div><strong>{formatNumber(locale, today.added)}</strong><span>{t("home.added")}</span></div>
      </section>

      <section className="home-metrics" aria-label={t("home.learningStatus")}>
        <Link href="/vocabulary">
          <strong>{formatNumber(locale, total)}</strong>
          <span>{t("home.words")}</span>
        </Link>
        <Link href="/vocabulary?status=WEAK">
          <strong>{formatNumber(locale, weakProduction)}</strong>
          <span>{t("home.weakProduction")}</span>
        </Link>
        <Link href="/mistakes">
          <strong>{formatNumber(locale, mistakes)}</strong>
          <span>{t("home.openMistakes")}</span>
        </Link>
      </section>

      <section className="home-next-grid" aria-label={t("home.nextActions")}>
        <Link href="/review" className="panel home-next-card">
          <div className="ia-card-icon"><Brain size={19} /></div>
          <div>
            <p className="eyebrow">{t("home.maintain")}</p>
            <h2>{t("nav.review")}</h2>
            <p>
              {due > 0
                ? t("home.dueNow", { count: formatNumber(locale, due) })
                : t("home.noReviews")}
            </p>
          </div>
          <span className="ia-card-link">
            {t("home.openReview")} <ArrowRight className="rtl-mirror" size={16} />
          </span>
        </Link>

        <Link href="/practice" className="panel home-next-card">
          <div className="ia-card-icon"><Sparkles size={19} /></div>
          <div>
            <p className="eyebrow">{t("home.apply")}</p>
            <h2>{t("nav.practice")}</h2>
            <p>{t("home.practiceDescription")}</p>
          </div>
          <span className="ia-card-link">
            {t("home.chooseSkill")} <ArrowRight className="rtl-mirror" size={16} />
          </span>
        </Link>

        {mistakes > 0 ? (
          <Link href="/mistakes" className="panel home-next-card">
            <div className="ia-card-icon"><TriangleAlert size={19} /></div>
            <div>
              <p className="eyebrow">{t("home.recommended")}</p>
              <h2>{t("home.cleanMistakes")}</h2>
              <p>
                {t.plural(
                  { one: "home.mistakesReady.one", other: "home.mistakesReady.other" },
                  mistakes,
                  { count: formatNumber(locale, mistakes) },
                )}
              </p>
            </div>
            <span className="ia-card-link">
              {t("home.reviewMistakes")} <ArrowRight className="rtl-mirror" size={16} />
            </span>
          </Link>
        ) : null}
      </section>

      <section className="panel home-progress-callout">
        <div>
          <p className="eyebrow">{t("home.progress")}</p>
          <h2>{t("home.fullPicture")}</h2>
          <p className="muted">{t("home.progressDescription")}</p>
        </div>
        <Link href="/progress" className="button button-secondary">
          <TrendingUp size={17} />
          {t("home.viewProgress")}
        </Link>
      </section>
    </main>
  );
}
