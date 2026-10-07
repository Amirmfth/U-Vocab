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
    <nav className="practice-lanes review-mode-grid [&_.practice-lane]:[position:relative] [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px]" aria-label={t("review.modes")}>
      <Link href="/mistakes" className="practice-lane [min-height:140px] [display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [gap:12px] [padding:14px] [border:1px_solid_var(--border)] [border-radius:18px] [background:var(--surface)]">
        <span
          className="review-mode-count [position:absolute] [top:12px] [right:12px] [min-width:24px] [height:24px] [display:grid] [place-items:center] [padding:0_6px] [border:1px_solid_var(--border)] [border-radius:999px] [background:var(--surface-raised)] [color:var(--text-muted)] [font-size:0.72rem] [font-weight:700] [line-height:1]"
          aria-label={t.plural(
            { one: "review.unresolvedMistakes.one", other: "review.unresolvedMistakes.other" },
            mistakes,
            { count: formatNumber(locale, mistakes) },
          )}
        >
          {formatNumber(locale, mistakes)}
        </span>
        <span className="practice-lane-icon [width:58px] [height:58px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:17px] [background:var(--surface-raised)] [color:var(--primary-strong)]"><TriangleAlert size={30} /></span>
        <span className="practice-lane-copy [min-width:0] [display:flex] [flex-direction:column] [align-items:center] [text-align:center] [&_strong]:[font-size:1rem]"><strong>{t("nav.mistakes")}</strong></span>
      </Link>
      <Link href="/rescue" className="practice-lane [min-height:140px] [display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [gap:12px] [padding:14px] [border:1px_solid_var(--border)] [border-radius:18px] [background:var(--surface)]">
        <span
          className="review-mode-count [position:absolute] [top:12px] [right:12px] [min-width:24px] [height:24px] [display:grid] [place-items:center] [padding:0_6px] [border:1px_solid_var(--border)] [border-radius:999px] [background:var(--surface-raised)] [color:var(--text-muted)] [font-size:0.72rem] [font-weight:700] [line-height:1]"
          aria-label={t.plural(
            { one: "review.rescueWords.one", other: "review.rescueWords.other" },
            rescueCount,
            { count: formatNumber(locale, rescueCount) },
          )}
        >
          {formatNumber(locale, rescueCount)}
        </span>
        <span className="practice-lane-icon [width:58px] [height:58px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:17px] [background:var(--surface-raised)] [color:var(--primary-strong)]"><LifeBuoy size={30} /></span>
        <span className="practice-lane-copy [min-width:0] [display:flex] [flex-direction:column] [align-items:center] [text-align:center] [&_strong]:[font-size:1rem]"><strong>{t("review.rescue")}</strong></span>
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
    return <Suspense fallback={<main className="page review-page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:860px] [margin-inline:auto] [&_.review-hero]:[gap:20px] [&_.review-hero]:[padding:20px] [&_.review-hero]:[border:1px_solid_var(--border)] [&_.review-hero]:[border-radius:var(--radius-lg)] [&_.review-hero]:[background:radial-gradient(circle_at_100%_0%,_rgba(139,_124,_255,_0.12),_transparent_45%),_var(--surface)] [&_.review-hero_h1]:[margin-top:6px] [&_.review-hero_h1]:[font-size:clamp(2.6rem,_13vw,_5.6rem)] [&_.review-hero_p:not(.eyebrow)]:[max-width:540px] [&_.review-start]:[min-height:52px] [&_.review-queue-summary]:[border-color:var(--border-strong)] [&_.review-queue-summary]:[background:transparent] [&_.review-queue-summary_>_div]:[min-height:78px] [&_.review-queue-summary_strong]:[font-size:1.45rem] [&_.review-queue-summary_strong]:[letter-spacing:-0.05em] [&_.review-mode-list]:[gap:0] [&_.review-mode-list_>_a]:[min-height:70px] [&_.review-mode-list_>_a]:[transition:background_140ms_ease,_color_140ms_ease,_transform_140ms_ease] [&_.review-mode-list_>_a:active]:[transform:scale(0.995)] min-[620px]:[&_.review-hero]:[padding:24px] min-[940px]:[padding-top:22px] min-[940px]:[&_.review-hero]:[padding:28px] min-[940px]:[&_.review-mode-list]:[display:grid] min-[940px]:[&_.review-mode-list]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] min-[940px]:[&_.review-mode-list]:[gap:10px] min-[940px]:[&_.review-mode-list]:[border:0] min-[940px]:[&_.review-mode-list_>_a]:[min-height:112px] min-[940px]:[&_.review-mode-list_>_a]:[grid-template-columns:30px_minmax(0,_1fr)] min-[940px]:[&_.review-mode-list_>_a]:[align-content:center] min-[940px]:[&_.review-mode-list_>_a]:[padding:16px] min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! min-[940px]:[&_.review-mode-list_>_a]:[border-radius:16px] min-[940px]:[&_.review-mode-list_>_a]:[background:var(--surface)] min-[940px]:[&_.review-mode-list_>_a_>_svg:last-child]:[grid-column:2] min-[940px]:[&_.review-mode-list_>_a_>_svg:last-child]:[margin-top:3px] min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! min-[940px]:[&_.review-mode-list_>_a:hover]:[background:var(--surface-raised)] min-[940px]:[&_.review-mode-list_>_a:hover]:[transform:translateY(-2px)]"><div className="skeleton loading-home-hero [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [min-height:205px]" aria-label={t("loading.surface", { surface: t("nav.review") })} /></main>}>
      <ReviewSessionContent userId={user.id} courseId={course.id} preferredTranslation={course.explanationLanguage} />
    </Suspense>;
  }

  return (
    <main className="page review-landing review-page [display:flex] [flex-direction:column] [gap:16px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:860px] [margin-inline:auto] [&_.review-hero]:[gap:20px] [&_.review-hero]:[padding:20px] [&_.review-hero]:[border:1px_solid_var(--border)] [&_.review-hero]:[border-radius:var(--radius-lg)] [&_.review-hero]:[background:radial-gradient(circle_at_100%_0%,_rgba(139,_124,_255,_0.12),_transparent_45%),_var(--surface)] [&_.review-hero_h1]:[margin-top:6px] [&_.review-hero_h1]:[font-size:clamp(2.6rem,_13vw,_5.6rem)] [&_.review-hero_p:not(.eyebrow)]:[max-width:540px] [&_.review-start]:[min-height:52px] [&_.review-queue-summary]:[border-color:var(--border-strong)] [&_.review-queue-summary]:[background:transparent] [&_.review-queue-summary_>_div]:[min-height:78px] [&_.review-queue-summary_strong]:[font-size:1.45rem] [&_.review-queue-summary_strong]:[letter-spacing:-0.05em] [&_.review-mode-list]:[gap:0] [&_.review-mode-list_>_a]:[min-height:70px] [&_.review-mode-list_>_a]:[transition:background_140ms_ease,_color_140ms_ease,_transform_140ms_ease] [&_.review-mode-list_>_a:active]:[transform:scale(0.995)] min-[620px]:[&_.review-hero]:[padding:24px] min-[940px]:[padding-top:22px] min-[940px]:[&_.review-hero]:[padding:28px] min-[940px]:[&_.review-mode-list]:[display:grid] min-[940px]:[&_.review-mode-list]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] min-[940px]:[&_.review-mode-list]:[gap:10px] min-[940px]:[&_.review-mode-list]:[border:0] min-[940px]:[&_.review-mode-list_>_a]:[min-height:112px] min-[940px]:[&_.review-mode-list_>_a]:[grid-template-columns:30px_minmax(0,_1fr)] min-[940px]:[&_.review-mode-list_>_a]:[align-content:center] min-[940px]:[&_.review-mode-list_>_a]:[padding:16px] min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! min-[940px]:[&_.review-mode-list_>_a]:[border-radius:16px] min-[940px]:[&_.review-mode-list_>_a]:[background:var(--surface)] min-[940px]:[&_.review-mode-list_>_a_>_svg:last-child]:[grid-column:2] min-[940px]:[&_.review-mode-list_>_a_>_svg:last-child]:[margin-top:3px] min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! min-[940px]:[&_.review-mode-list_>_a:hover]:[background:var(--surface-raised)] min-[940px]:[&_.review-mode-list_>_a:hover]:[transform:translateY(-2px)]">
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
    <div className="skeleton loading-home-hero [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [min-height:205px]" />
    <div className="practice-lanes review-mode-grid [&_.practice-lane]:[position:relative] [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px]">
      <div className="skeleton loading-mode-card [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [position:relative]" /><div className="skeleton loading-mode-card [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [position:relative]" />
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
      <section className="review-hero [display:flex] [flex-direction:column] [gap:16px] [padding:14px_0_4px] [&_h1]:[margin:4px_0_0] [&_h1]:[font-size:clamp(2.3rem,_12vw,_5rem)] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] [&_p:not(.eyebrow)]:[margin:9px_0_0] [&_p:not(.eyebrow)]:[max-width:600px] [&_p:not(.eyebrow)]:[color:var(--text-soft)] [&_p:not(.eyebrow)]:[line-height:1.55] min-[620px]:[flex-direction:row] min-[620px]:[align-items:end] min-[620px]:[justify-content:space-between]">
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
          <Link href="/review?start=1" className="button button-primary review-start [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [width:100%] [min-height:54px] min-[620px]:[width:auto] min-[620px]:[min-width:160px]">
            <Brain size={18} />
            {t("review.start")}
          </Link>
        ) : (
          <Link href="/rescue" className="button button-primary review-start [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [width:100%] [min-height:54px] min-[620px]:[width:auto] min-[620px]:[min-width:160px]">
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
