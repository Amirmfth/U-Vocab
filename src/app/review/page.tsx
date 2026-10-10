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
    <nav className="practice-lanes review-mode-grid in-practice-lane:relative grid grid-template-columns-repeat-2-minmax-0-1fr gap-3" aria-label={t("review.modes")}>
      <Link href="/mistakes" className="practice-lane min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 border-1px-solid-border-2 rounded-uv-r6d27d54c6c bg-uv-surface">
        <span
          className="review-mode-count absolute top-3 right-3 min-w-6 h-6 grid place-items-center padding-0-6px border-1px-solid-border-2 rounded-uv-red9ab892c5 bg-uv-surface-raised text-uv-text-muted text-uv-ff1713651e0 font-bold line-height-1"
          aria-label={t.plural(
            { one: "review.unresolvedMistakes.one", other: "review.unresolvedMistakes.other" },
            mistakes,
            { count: formatNumber(locale, mistakes) },
          )}
        >
          {formatNumber(locale, mistakes)}
        </span>
        <span className="practice-lane-icon w-14.5 h-14.5 grid place-items-center border-1px-solid-border-2 rounded-uv-r157d8af993 bg-uv-surface-raised text-uv-primary-strong"><TriangleAlert size={30} /></span>
        <span className="practice-lane-copy min-w-0 flex flex-col items-center text-center in-strong-2:text-uv-f19feeb881c"><strong>{t("nav.mistakes")}</strong></span>
      </Link>
      <Link href="/rescue" className="practice-lane min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 border-1px-solid-border-2 rounded-uv-r6d27d54c6c bg-uv-surface">
        <span
          className="review-mode-count absolute top-3 right-3 min-w-6 h-6 grid place-items-center padding-0-6px border-1px-solid-border-2 rounded-uv-red9ab892c5 bg-uv-surface-raised text-uv-text-muted text-uv-ff1713651e0 font-bold line-height-1"
          aria-label={t.plural(
            { one: "review.rescueWords.one", other: "review.rescueWords.other" },
            rescueCount,
            { count: formatNumber(locale, rescueCount) },
          )}
        >
          {formatNumber(locale, rescueCount)}
        </span>
        <span className="practice-lane-icon w-14.5 h-14.5 grid place-items-center border-1px-solid-border-2 rounded-uv-r157d8af993 bg-uv-surface-raised text-uv-primary-strong"><LifeBuoy size={30} /></span>
        <span className="practice-lane-copy min-w-0 flex flex-col items-center text-center in-strong-2:text-uv-f19feeb881c"><strong>{t("review.rescue")}</strong></span>
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
    return <Suspense fallback={<main className="page review-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto in-review-hero:gap-5 in-review-hero:p-5 in-review-hero:border-1px-solid-border-2 in-review-hero:rounded-uv-r02a0a889dd in-review-hero:bg-radial-gradient-circle-at-100pct-0pct-rgb-139-124-255-0p12-t in-review-hero-h1:mt-1.5 in-review-hero-h1:text-uv-fc93d2c021e in-review-hero-p-not-eyebrow:max-w-135 in-review-start:min-h-13 in-review-queue-summary:border-uv-border-strong in-review-queue-summary:bg-transparent in-review-queue-summary-div:min-h-19.5 in-review-queue-summary-strong:text-uv-fab62110780 in-review-queue-summary-strong:letter-spacing-0p05em-2 in-review-mode-list:gap-0 in-review-mode-list-a:min-h-17.5 in-review-mode-list-a:transition-background-140ms-ease-color-140ms-ease-transform-140 in-review-mode-list-a-active:transform-scale-0p995 uv-min620:in-review-hero:p-6 uv-min940:pt-5.5 uv-min940:in-review-hero:p-7 uv-min940:in-review-mode-list:grid uv-min940:in-review-mode-list:grid-template-columns-repeat-3-minmax-0-1fr uv-min940:in-review-mode-list:gap-2.5 uv-min940:in-review-mode-list:border-0 uv-min940:in-review-mode-list-a:min-h-28 uv-min940:in-review-mode-list-a:grid-template-columns-30px-minmax-0-1fr uv-min940:in-review-mode-list-a:align-content-center uv-min940:in-review-mode-list-a:p-4 min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! uv-min940:in-review-mode-list-a:rounded-uv-r4678bd4d8a uv-min940:in-review-mode-list-a:bg-uv-surface uv-min940:in-review-mode-list-a-svg-last-child:grid-column-2 uv-min940:in-review-mode-list-a-svg-last-child:mt-0.75 min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! uv-min940:in-review-mode-list-a-hover:bg-uv-surface-raised uv-min940:in-review-mode-list-a-hover:transform-translatey-2px"><div className="skeleton loading-home-hero rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite min-h-51.25" aria-label={t("loading.surface", { surface: t("nav.review") })} /></main>}>
      <ReviewSessionContent userId={user.id} courseId={course.id} preferredTranslation={course.explanationLanguage} />
    </Suspense>;
  }

  return (
    <main className="page review-landing review-page flex flex-col gap-4 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto in-review-hero:gap-5 in-review-hero:p-5 in-review-hero:border-1px-solid-border-2 in-review-hero:rounded-uv-r02a0a889dd in-review-hero:bg-radial-gradient-circle-at-100pct-0pct-rgb-139-124-255-0p12-t in-review-hero-h1:mt-1.5 in-review-hero-h1:text-uv-fc93d2c021e in-review-hero-p-not-eyebrow:max-w-135 in-review-start:min-h-13 in-review-queue-summary:border-uv-border-strong in-review-queue-summary:bg-transparent in-review-queue-summary-div:min-h-19.5 in-review-queue-summary-strong:text-uv-fab62110780 in-review-queue-summary-strong:letter-spacing-0p05em-2 in-review-mode-list:gap-0 in-review-mode-list-a:min-h-17.5 in-review-mode-list-a:transition-background-140ms-ease-color-140ms-ease-transform-140 in-review-mode-list-a-active:transform-scale-0p995 uv-min620:in-review-hero:p-6 uv-min940:pt-5.5 uv-min940:in-review-hero:p-7 uv-min940:in-review-mode-list:grid uv-min940:in-review-mode-list:grid-template-columns-repeat-3-minmax-0-1fr uv-min940:in-review-mode-list:gap-2.5 uv-min940:in-review-mode-list:border-0 uv-min940:in-review-mode-list-a:min-h-28 uv-min940:in-review-mode-list-a:grid-template-columns-30px-minmax-0-1fr uv-min940:in-review-mode-list-a:align-content-center uv-min940:in-review-mode-list-a:p-4 min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! uv-min940:in-review-mode-list-a:rounded-uv-r4678bd4d8a uv-min940:in-review-mode-list-a:bg-uv-surface uv-min940:in-review-mode-list-a-svg-last-child:grid-column-2 uv-min940:in-review-mode-list-a-svg-last-child:mt-0.75 min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! uv-min940:in-review-mode-list-a-hover:bg-uv-surface-raised uv-min940:in-review-mode-list-a-hover:transform-translatey-2px">
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
    <div className="skeleton loading-home-hero rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite min-h-51.25" />
    <div className="practice-lanes review-mode-grid in-practice-lane:relative grid grid-template-columns-repeat-2-minmax-0-1fr gap-3">
      <div className="skeleton loading-mode-card rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite relative" /><div className="skeleton loading-mode-card rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite relative" />
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
      <section className="review-hero flex flex-col gap-4 padding-14px-0-4px in-h1:margin-4px-0-0 in-h1:text-uv-f25721588d4 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 in-p-not-eyebrow:margin-9px-0-0 in-p-not-eyebrow:max-w-150 in-p-not-eyebrow:text-uv-text-soft in-p-not-eyebrow:line-height-1p55 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between">
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
          <Link href="/review?start=1" className="button button-primary review-start inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current w-full min-h-13.5 uv-min620:w-auto uv-min620:min-w-40">
            <Brain size={18} />
            {t("review.start")}
          </Link>
        ) : (
          <Link href="/rescue" className="button button-primary review-start inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current w-full min-h-13.5 uv-min620:w-auto uv-min620:min-w-40">
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
