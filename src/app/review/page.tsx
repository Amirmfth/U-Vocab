import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { Brain, LifeBuoy, TriangleAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { db } from "@/lib/db";
import { getReviewQueueData } from "@/lib/review-queue";
import { getRescueWords } from "@/lib/rescue";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import type { Translator } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";
import { ReviewSession } from "./ReviewSession";
import { PersistedFirstUseGuide } from "@/components/PersistedFirstUseGuide";
import { FIRST_USE_GUIDES } from "@/lib/first-use-guidance";
import { sendProductEventForUser } from "@/lib/analytics/server";

function ReviewModes({
  mistakes,
  rescueCount,
  locale,
  t,
}: {
  mistakes: number;
  rescueCount: number;
  locale: UiLocale;
  t: Translator;
}) {
  return (
    <nav className="practice-lanes review-mode-grid" aria-label={t("review.modes")}>
      <Link href="/mistakes" className="practice-lane">
        <span
          className="review-mode-count"
          aria-label={t.plural(
            { one: "review.unresolvedMistakes.one", other: "review.unresolvedMistakes.other" },
            mistakes,
            { count: formatNumber(locale, mistakes) },
          )}
        >
          {formatNumber(locale, mistakes)}
        </span>
        <span className="practice-lane-icon"><TriangleAlert size={30} /></span>
        <span className="practice-lane-copy"><strong>{t("nav.mistakes")}</strong></span>
      </Link>
      <Link href="/rescue" className="practice-lane">
        <span
          className="review-mode-count"
          aria-label={t.plural(
            { one: "review.rescueWords.one", other: "review.rescueWords.other" },
            rescueCount,
            { count: formatNumber(locale, rescueCount) },
          )}
        >
          {formatNumber(locale, rescueCount)}
        </span>
        <span className="practice-lane-icon"><LifeBuoy size={30} /></span>
        <span className="practice-lane-copy"><strong>{t("review.rescue")}</strong></span>
      </Link>
    </nav>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; notification?: string }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([
    getCurrentUser(),
    getCurrentCourse(),
    searchParams,
  ]);
  const { locale, t } = await getServerTranslator(user);

  if (query.notification === "review_reminder") {
    await sendProductEventForUser(user.id, "review_notification_opened", { source: "push" });
  }

  if (query.start === "1") {
    return <Suspense fallback={<main className="page review-page"><div className="skeleton loading-home-hero" aria-label={t("loading.surface", { surface: t("nav.review") })} /></main>}>
      <ReviewSessionContent userId={user.id} courseId={course.id} preferredTranslation={course.explanationLanguage} />
    </Suspense>;
  }

  return (
    <main className="page review-landing review-page">
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.review}
        title={t("guidance.review.title")}
        description={t("guidance.review.body")}
        items={[t("guidance.review.item1"), t("guidance.review.item2")]}
        dismissLabel={t("guidance.dismiss")}
      />
      <Suspense fallback={<ReviewLandingLoading label={t("loading.surface", { surface: t("nav.review") })} />}>
        <ReviewLandingContent userId={user.id} courseId={course.id} locale={locale} t={t} />
      </Suspense>
    </main>
  );
}

async function ReviewSessionContent({ userId, courseId, preferredTranslation }: {
  userId: string;
  courseId: string;
  preferredTranslation: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const initialQueue = await getReviewQueueData({ userId, userCourseId: courseId, preferredTranslation });
  return <ReviewSession initialData={initialQueue} userScope={courseId} />;
}

function ReviewLandingLoading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label}>
    <div className="skeleton loading-home-hero" />
    <div className="practice-lanes review-mode-grid">
      <div className="skeleton loading-mode-card" /><div className="skeleton loading-mode-card" />
    </div>
  </div>;
}

async function ReviewLandingContent({ userId, courseId, locale, t }: {
  userId: string;
  courseId: string;
  locale: UiLocale;
  t: Translator;
}) {

  const now = new Date();
  const [dueCount, mistakeCount, rescueWords] = await Promise.all([
    db.userVocabulary.count({
      where: {
        userCourseId: courseId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    }),
    db.mistake.count({ where: { userCourseId: courseId, resolvedAt: null } }),
    getRescueWords(userId, courseId, Number.POSITIVE_INFINITY),
  ]);
  const rescueCount = rescueWords.length;

  return (
    <>
      <section className="review-hero">
        <div>
          <h1>
            {dueCount
              ? t("review.dueNow", { count: formatNumber(locale, dueCount) })
              : t("review.caughtUp")}
          </h1>
          <p>
            {dueCount
              ? t("review.dueDescription")
              : t("review.clearDescription")}
          </p>
        </div>
        {dueCount ? (
          <Link href="/review?start=1" className="button button-primary review-start">
            <Brain size={18} />
            {t("review.start")}
          </Link>
        ) : (
          <Link href="/rescue" className="button button-primary review-start">
            <LifeBuoy size={18} />
            {t("review.reinforceWeak")}
          </Link>
        )}
      </section>

      <ReviewModes
        mistakes={mistakeCount}
        rescueCount={rescueCount}
        locale={locale}
        t={t}
      />
    </>
  );
}
