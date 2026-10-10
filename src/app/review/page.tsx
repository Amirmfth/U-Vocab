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
    <nav className="practice-lanes review-mode-grid uv-v7d2af6c2de:relative grid uv-grid-template-columns-dd0b1a1848 gap-3" aria-label={t("review.modes")}>
      <Link href="/mistakes" className="practice-lane min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 uv-border-8d7f82f403 rounded-uv-r6d27d54c6c bg-uv-surface">
        <span
          className="review-mode-count absolute top-3 right-3 min-w-6 h-6 grid uv-place-items-305047e96e uv-padding-a95524d417 uv-border-8d7f82f403 rounded-uv-red9ab892c5 bg-uv-surface-raised text-uv-text-muted text-uv-ff1713651e0 font-bold uv-line-height-356a192b79"
          aria-label={t.plural(
            { one: "review.unresolvedMistakes.one", other: "review.unresolvedMistakes.other" },
            mistakes,
            { count: formatNumber(locale, mistakes) },
          )}
        >
          {formatNumber(locale, mistakes)}
        </span>
        <span className="practice-lane-icon w-14.5 h-14.5 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r157d8af993 bg-uv-surface-raised text-uv-primary-strong"><TriangleAlert size={30} /></span>
        <span className="practice-lane-copy min-w-0 flex flex-col items-center text-center uv-veda02a0adb:text-uv-f19feeb881c"><strong>{t("nav.mistakes")}</strong></span>
      </Link>
      <Link href="/rescue" className="practice-lane min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 uv-border-8d7f82f403 rounded-uv-r6d27d54c6c bg-uv-surface">
        <span
          className="review-mode-count absolute top-3 right-3 min-w-6 h-6 grid uv-place-items-305047e96e uv-padding-a95524d417 uv-border-8d7f82f403 rounded-uv-red9ab892c5 bg-uv-surface-raised text-uv-text-muted text-uv-ff1713651e0 font-bold uv-line-height-356a192b79"
          aria-label={t.plural(
            { one: "review.rescueWords.one", other: "review.rescueWords.other" },
            rescueCount,
            { count: formatNumber(locale, rescueCount) },
          )}
        >
          {formatNumber(locale, rescueCount)}
        </span>
        <span className="practice-lane-icon w-14.5 h-14.5 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r157d8af993 bg-uv-surface-raised text-uv-primary-strong"><LifeBuoy size={30} /></span>
        <span className="practice-lane-copy min-w-0 flex flex-col items-center text-center uv-veda02a0adb:text-uv-f19feeb881c"><strong>{t("review.rescue")}</strong></span>
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
    return <Suspense fallback={<main className="page review-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto uv-vd132eeea1f:gap-5 uv-vd132eeea1f:p-5 uv-vd132eeea1f:uv-border-8d7f82f403 uv-vd132eeea1f:rounded-uv-r02a0a889dd uv-vd132eeea1f:uv-background-78c5b2e93a uv-v93bc46e45f:mt-1.5 uv-v93bc46e45f:text-uv-fc93d2c021e uv-ve1c0ec74c0:max-w-135 uv-v9fef326f97:min-h-13 uv-v2844d96cbb:border-uv-border-strong uv-v2844d96cbb:bg-transparent uv-v496f127096:min-h-19.5 uv-ve1c02f4141:text-uv-fab62110780 uv-ve1c02f4141:uv-letter-spacing-52201352dd uv-v73b87ee743:gap-0 uv-vdf55f3f410:min-h-17.5 uv-vdf55f3f410:uv-transition-5b1b79097a uv-v9d433574a4:uv-transform-46cefb7b73 uv-min620:uv-vd132eeea1f:p-6 uv-min940:pt-5.5 uv-min940:uv-vd132eeea1f:p-7 uv-min940:uv-v73b87ee743:grid uv-min940:uv-v73b87ee743:uv-grid-template-columns-563355decf uv-min940:uv-v73b87ee743:gap-2.5 uv-min940:uv-v73b87ee743:border-0 uv-min940:uv-vdf55f3f410:min-h-28 uv-min940:uv-vdf55f3f410:uv-grid-template-columns-51adf3fd32 uv-min940:uv-vdf55f3f410:uv-align-content-305047e96e uv-min940:uv-vdf55f3f410:p-4 min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! uv-min940:uv-vdf55f3f410:rounded-uv-r4678bd4d8a uv-min940:uv-vdf55f3f410:bg-uv-surface uv-min940:uv-vc0e46870e2:uv-grid-column-da4b9237ba uv-min940:uv-vc0e46870e2:mt-0.75 min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! uv-min940:uv-v83379fbed0:bg-uv-surface-raised uv-min940:uv-v83379fbed0:uv-transform-1f1d96f064"><div className="skeleton loading-home-hero rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b min-h-51.25" aria-label={t("loading.surface", { surface: t("nav.review") })} /></main>}>
      <ReviewSessionContent userId={user.id} courseId={course.id} preferredTranslation={course.explanationLanguage} />
    </Suspense>;
  }

  return (
    <main className="page review-landing review-page flex flex-col gap-4 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto uv-vd132eeea1f:gap-5 uv-vd132eeea1f:p-5 uv-vd132eeea1f:uv-border-8d7f82f403 uv-vd132eeea1f:rounded-uv-r02a0a889dd uv-vd132eeea1f:uv-background-78c5b2e93a uv-v93bc46e45f:mt-1.5 uv-v93bc46e45f:text-uv-fc93d2c021e uv-ve1c0ec74c0:max-w-135 uv-v9fef326f97:min-h-13 uv-v2844d96cbb:border-uv-border-strong uv-v2844d96cbb:bg-transparent uv-v496f127096:min-h-19.5 uv-ve1c02f4141:text-uv-fab62110780 uv-ve1c02f4141:uv-letter-spacing-52201352dd uv-v73b87ee743:gap-0 uv-vdf55f3f410:min-h-17.5 uv-vdf55f3f410:uv-transition-5b1b79097a uv-v9d433574a4:uv-transform-46cefb7b73 uv-min620:uv-vd132eeea1f:p-6 uv-min940:pt-5.5 uv-min940:uv-vd132eeea1f:p-7 uv-min940:uv-v73b87ee743:grid uv-min940:uv-v73b87ee743:uv-grid-template-columns-563355decf uv-min940:uv-v73b87ee743:gap-2.5 uv-min940:uv-v73b87ee743:border-0 uv-min940:uv-vdf55f3f410:min-h-28 uv-min940:uv-vdf55f3f410:uv-grid-template-columns-51adf3fd32 uv-min940:uv-vdf55f3f410:uv-align-content-305047e96e uv-min940:uv-vdf55f3f410:p-4 min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! uv-min940:uv-vdf55f3f410:rounded-uv-r4678bd4d8a uv-min940:uv-vdf55f3f410:bg-uv-surface uv-min940:uv-vc0e46870e2:uv-grid-column-da4b9237ba uv-min940:uv-vc0e46870e2:mt-0.75 min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! uv-min940:uv-v83379fbed0:bg-uv-surface-raised uv-min940:uv-v83379fbed0:uv-transform-1f1d96f064">
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
    <div className="skeleton loading-home-hero rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b min-h-51.25" />
    <div className="practice-lanes review-mode-grid uv-v7d2af6c2de:relative grid uv-grid-template-columns-dd0b1a1848 gap-3">
      <div className="skeleton loading-mode-card rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b relative" /><div className="skeleton loading-mode-card rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b relative" />
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
      <section className="review-hero flex flex-col gap-4 uv-padding-8212d67a79 uv-v3bccf64584:uv-margin-02a5349d58 uv-v3bccf64584:text-uv-f25721588d4 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-vb497f87765:uv-margin-dd8c014387 uv-vb497f87765:max-w-150 uv-vb497f87765:text-uv-text-soft uv-vb497f87765:uv-line-height-05c248da4c uv-min620:flex-row uv-min620:items-end uv-min620:justify-between">
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
          <Link href="/review?start=1" className="button button-primary review-start inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current w-full min-h-13.5 uv-min620:w-auto uv-min620:min-w-40">
            <Brain size={18} />
            {t("review.start")}
          </Link>
        ) : (
          <Link href="/rescue" className="button button-primary review-start inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current w-full min-h-13.5 uv-min620:w-auto uv-min620:min-w-40">
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
