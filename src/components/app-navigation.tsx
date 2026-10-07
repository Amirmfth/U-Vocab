"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedAppIcon, type AnimatedAppIconName } from "@/components/animated-app-icon";
import {
  LEARNING_SECTIONS,
  PRIMARY_LEARNING_SECTIONS,
  routeOwner,
  sectionForPath,
  type LearningSection,
} from "@/lib/navigation";
import { useI18n } from "@/i18n/client";
import type { MessageKey, Translator } from "@/i18n/core";
import { formatNumber } from "@/i18n/format";

const MobileAddVocabularySheet = dynamic(
  () => import("@/components/mobile-add-vocabulary-sheet").then((module) => module.MobileAddVocabularySheet),
  { ssr: false },
);

const primaryMeta: Record<LearningSection, { labelKey: MessageKey; icon: AnimatedAppIconName }> = {
  words: { labelKey: "nav.words", icon: "words" },
  grammar: { labelKey: "nav.grammar", icon: "grammar" },
  review: { labelKey: "nav.review", icon: "review" },
  practice: { labelKey: "nav.practice", icon: "practice" },
};

const primary = PRIMARY_LEARNING_SECTIONS.map((section) => ({
  section,
  href: LEARNING_SECTIONS[section].href,
  ...primaryMeta[section],
}));

const insights: Array<{ href: string; labelKey: MessageKey; icon: AnimatedAppIconName }> = [
  { href: "/progress", labelKey: "nav.fullProgress", icon: "progress" },
];

const system: Array<{ href: string; labelKey: MessageKey; icon: AnimatedAppIconName }> = [
  { href: "/settings", labelKey: "nav.settings", icon: "settings" },
];

const routeLabelKeys: Record<string, MessageKey> = {
  "Add word": "nav.addWord",
  "My words": "nav.myWords",
  "Standard review": "nav.standardReview",
  Mistakes: "nav.mistakes",
  "Rescue words": "nav.rescueWords",
  Practice: "nav.practice",
  Grammar: "nav.grammar",
  Writing: "nav.writing",
  Reading: "nav.reading",
  "Legacy reading": "nav.legacyReading",
  Conversation: "nav.conversation",
  Speaking: "nav.speaking",
  Battles: "nav.battles",
  "Full progress": "nav.fullProgress",
  Settings: "nav.settings",
};

function localizedRouteLabel(t: Translator, label: string) {
  const key = routeLabelKeys[label];
  return key ? t(key) : label;
}

function NavLink({
  pathname,
  section,
  href,
  label,
  icon,
  dueCount,
}: {
  pathname: string;
  section: LearningSection;
  href: string;
  label: string;
  icon: AnimatedAppIconName;
  dueCount?: number | null;
}) {
  const isActive = sectionForPath(pathname) === section;
  const { locale, t } = useI18n();
  const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;

  return (
    <Link
      href={href}
      className={"nav-link min-[940px]:[min-height:42px] min-[940px]:[display:flex] min-[940px]:[align-items:center] min-[940px]:[gap:11px] min-[940px]:[padding:0_11px] min-[940px]:[border-radius:12px] min-[940px]:[color:var(--text-muted)] min-[940px]:[font-size:0.86rem] min-[940px]:[transition:background_150ms_ease,_color_150ms_ease] min-[940px]:[&:hover]:[color:var(--text-soft)] min-[940px]:[&:hover]:[background:var(--surface)] min-[940px]:[&.is-active]:[color:var(--text)] min-[940px]:[&.is-active]:[background:var(--primary-soft)] [min-height:var(--tap-target)] " + (isActive ? "is-active" : "")}
      aria-current={isActive ? (pathname === href ? "page" : "location") : undefined}
      aria-label={
        section === "review" && dueCount
          ? t("nav.reviewDue", { count: formattedDueCount ?? dueCount })
          : undefined
      }
    >
      <AnimatedAppIcon name={icon} size={18} />
      <span>{label}</span>
      {section === "review" && dueCount ? (
        <span
          className="review-nav-badge [min-width:20px] [height:20px] [margin-left:auto] [padding:0_5px] [display:inline-flex] [align-items:center] [justify-content:center] [border-radius:999px] [background:var(--primary-strong)] [color:#111114] [font-size:0.65rem] [font-weight:750] [line-height:1]"
          title={t("nav.reviewsDue", { count: formattedDueCount ?? dueCount })}
        >
          {dueCount > 99 ? formatNumber(locale, 99) + "+" : formattedDueCount}
        </span>
      ) : null}
    </Link>
  );
}

export function AppNavigation({
  translationPreference,
  initialDueCount,
}: {
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
  initialDueCount: number | null;
}) {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [hasOpenedAddSheet, setHasOpenedAddSheet] = useState(false);
  const [dueCount, setDueCount] = useState<number | null>(initialDueCount);

  useEffect(() => {
    let active = true;
    async function refreshDueCount() {
      try {
        const response = await fetch("/api/review/due-count", { cache: "no-store" });
        if (!response.ok) return;
        const data: { dueCount: number } = await response.json();
        if (active && Number.isFinite(data.dueCount)) setDueCount(data.dueCount);
      } catch {
        // Keep the last known count until the next refresh.
      }
    }
    void refreshDueCount();
    const interval = window.setInterval(() => void refreshDueCount(), 30_000);
    const onFocus = () => void refreshDueCount();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshDueCount();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("u-vocab:review-count-changed", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("u-vocab:review-count-changed", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  const owner = routeOwner(pathname);
  const isPrimary =
    pathname === "/vocabulary" ||
    pathname === "/grammar" ||
    pathname === "/review" ||
    pathname === "/practice";

  return (
    <>
      <header className="mobile-header [position:fixed] [inset:0_0_auto_0] [z-index:50] [height:calc(60px_+_env(safe-area-inset-top))] [padding:env(safe-area-inset-top)_16px_0] [display:flex] [align-items:center] [justify-content:space-between] [border-bottom:1px_solid_rgba(255,_255,_255,_0.06)] [background:rgba(9,_9,_11,_0.82)] [backdrop-filter:blur(18px)] min-[940px]:[display:none]">
        <Link href="/vocabulary" className="brand [display:inline-flex] [align-items:center] [gap:9px] [font-weight:620] [letter-spacing:-0.02em]" aria-label={t("nav.brandWords")}>
          <span className="brand-mark [width:30px] [height:30px] [display:grid] [place-items:center] [border-radius:10px] [background:linear-gradient(145deg,_var(--primary-strong),_#6657ee)] [color:white] [box-shadow:inset_0_1px_0_rgba(255,_255,_255,_0.25)]">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions [display:flex] [gap:8px]">
          <button
            type="button"
            className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]"
            aria-label={t("nav.addWord")}
            aria-expanded={isAddSheetOpen}
            aria-controls="mobile-add-sheet [position:fixed] [z-index:100] [inset:0] [display:flex] [align-items:flex-end] min-[940px]:[display:none]"
            onClick={() => {
              setHasOpenedAddSheet(true);
              setIsAddSheetOpen(true);
            }}
          >
            <AnimatedAppIcon name="add" size={20} />
          </button>
          <Link href="/settings" className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]" aria-label={t("nav.settings")}>
            <AnimatedAppIcon name="settings" size={19} />
          </Link>
        </div>
      </header>

      <aside className="desktop-sidebar [display:none] min-[940px]:[position:fixed] min-[940px]:[inset:0_auto_0_0] min-[940px]:[z-index:50] min-[940px]:[width:242px] min-[940px]:[display:flex] min-[940px]:[flex-direction:column] min-[940px]:[padding:24px_16px] min-[940px]:[border-right:1px_solid_var(--border)] min-[940px]:[background:rgba(13,_13,_16,_0.95)]">
        <Link href="/vocabulary" className="brand sidebar-brand [display:inline-flex] [align-items:center] [gap:9px] [font-weight:620] [letter-spacing:-0.02em] min-[940px]:[padding:0_8px_24px]" aria-label={t("nav.brandWords")}>
          <span className="brand-mark [width:30px] [height:30px] [display:grid] [place-items:center] [border-radius:10px] [background:linear-gradient(145deg,_var(--primary-strong),_#6657ee)] [color:white] [box-shadow:inset_0_1px_0_rgba(255,_255,_255,_0.25)]">U</span>
          <span>U-Vocab</span>
        </Link>

        <nav className="sidebar-nav min-[940px]:[display:flex] min-[940px]:[flex-direction:column] min-[940px]:[gap:5px]" aria-label={t("nav.main")}>
          <p className="nav-eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600] min-[940px]:[padding:0_10px_7px]">{t("common.learn")}</p>
          {primary.map((item) => (
            <NavLink
              key={item.section}
              pathname={pathname}
              section={item.section}
              href={item.href}
              label={t(item.labelKey)}
              icon={item.icon}
              dueCount={item.section === "review" ? dueCount : null}
            />
          ))}
        </nav>

        <div className="sidebar-secondary [margin-top:auto] [display:flex] [flex-direction:column] [gap:5px] [padding-top:24px] [border-top:1px_solid_var(--border)] [&_.sidebar-add]:[margin-top:10px]">
          <p className="nav-eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600] min-[940px]:[padding:0_10px_7px]">{t("common.insights")}</p>
          {insights.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link min-[940px]:[min-height:42px] min-[940px]:[display:flex] min-[940px]:[align-items:center] min-[940px]:[gap:11px] min-[940px]:[padding:0_11px] min-[940px]:[border-radius:12px] min-[940px]:[color:var(--text-muted)] min-[940px]:[font-size:0.86rem] min-[940px]:[transition:background_150ms_ease,_color_150ms_ease] min-[940px]:[&:hover]:[color:var(--text-soft)] min-[940px]:[&:hover]:[background:var(--surface)] min-[940px]:[&.is-active]:[color:var(--text)] min-[940px]:[&.is-active]:[background:var(--primary-soft)] [min-height:var(--tap-target)] " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <p className="nav-eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600] min-[940px]:[padding:0_10px_7px]">{t("common.account")}</p>
          {system.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link min-[940px]:[min-height:42px] min-[940px]:[display:flex] min-[940px]:[align-items:center] min-[940px]:[gap:11px] min-[940px]:[padding:0_11px] min-[940px]:[border-radius:12px] min-[940px]:[color:var(--text-muted)] min-[940px]:[font-size:0.86rem] min-[940px]:[transition:background_150ms_ease,_color_150ms_ease] min-[940px]:[&:hover]:[color:var(--text-soft)] min-[940px]:[&:hover]:[background:var(--surface)] min-[940px]:[&.is-active]:[color:var(--text)] min-[940px]:[&.is-active]:[background:var(--primary-soft)] [min-height:var(--tap-target)] " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <Link href="/vocabulary/new" className="sidebar-add min-[940px]:[min-height:44px] min-[940px]:[margin-top:auto] min-[940px]:[display:flex] min-[940px]:[align-items:center] min-[940px]:[justify-content:center] min-[940px]:[gap:8px] min-[940px]:[border-radius:13px] min-[940px]:[background:var(--text)] min-[940px]:[color:#111114] min-[940px]:[font-size:0.84rem] min-[940px]:[font-weight:650]">
            <AnimatedAppIcon name="add" size={18} />
            {t("nav.addWord")}
          </Link>
        </div>
      </aside>

      {!isPrimary && owner.section ? (
        <nav className="section-context-nav [display:none] min-[940px]:[position:fixed] min-[940px]:[z-index:40] min-[940px]:[top:24px] min-[940px]:[right:36px] min-[940px]:[display:flex] min-[940px]:[align-items:center] min-[940px]:[gap:7px] min-[940px]:[max-width:calc(100vw_-_330px)] min-[940px]:[padding:7px_10px] min-[940px]:[border:1px_solid_var(--border)] min-[940px]:[border-radius:999px] min-[940px]:[background:rgba(17,_17,_20,_0.88)] min-[940px]:[backdrop-filter:blur(12px)] min-[940px]:[color:var(--text-muted)] min-[940px]:[font-size:0.68rem] min-[940px]:[&_a]:[color:var(--primary-strong)] min-[940px]:[&_a]:[font-weight:600] min-[940px]:[&_strong]:[overflow:hidden] min-[940px]:[&_strong]:[color:var(--text-soft)] min-[940px]:[&_strong]:[text-overflow:ellipsis] min-[940px]:[&_strong]:[white-space:nowrap]" aria-label={t("nav.sectionContext")}>
          <Link href={LEARNING_SECTIONS[owner.section].href}>
            {t(
              owner.section === "words"
                ? "nav.words"
                : owner.section === "grammar"
                  ? "nav.grammar"
                  : owner.section === "review"
                    ? "nav.review"
                    : "nav.practice",
            )}
          </Link>
          <span aria-hidden="true">/</span>
          {owner.group ? (
            <>
              <span>{localizedRouteLabel(t, owner.group)}</span>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <strong>{localizedRouteLabel(t, owner.label)}</strong>
        </nav>
      ) : null}

      <nav className="mobile-bottom-nav [position:fixed] [z-index:50] [inset:auto_10px_max(10px,_env(safe-area-inset-bottom))_10px] [display:grid] [grid-template-columns:repeat(4,_1fr)] [gap:2px] [padding:9px] [border:1px_solid_rgba(255,_255,_255,_0.08)] [border-radius:20px] [background:rgba(17,_17,_20,_0.92)] [box-shadow:0_18px_50px_rgba(0,_0,_0,_0.4)] [backdrop-filter:blur(20px)] min-[940px]:[display:none]" aria-label={t("nav.mobile")}>
        {primary.map((item) => {
          const isActive = sectionForPath(pathname) === item.section;
          const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;
          return (
            <Link
              key={item.section}
              href={item.href}
              className={"mobile-nav-item [display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [gap:4px] [border-radius:14px] [color:var(--text-muted)] [font-size:0.66rem] [transition:color_160ms_ease,_transform_160ms_ease] [&:active]:[transform:scale(0.96)] [&.is-active]:[color:var(--primary)] [min-height:var(--tap-target)] " + (isActive ? "is-active" : "")}
              aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
            >
              <span className="mobile-nav-icon [position:relative] [display:inline-flex] [&_.review-nav-badge]:[position:absolute] [&_.review-nav-badge]:[top:-8px] [&_.review-nav-badge]:[left:14px] [&_.review-nav-badge]:[min-width:16px] [&_.review-nav-badge]:[height:16px] [&_.review-nav-badge]:[padding-inline:3px] [&_.review-nav-badge]:[font-size:0.58rem]">
                <AnimatedAppIcon name={item.icon} size={25} />
                {item.section === "review" && dueCount ? (
                  <span
                    className="review-nav-badge [min-width:20px] [height:20px] [margin-left:auto] [padding:0_5px] [display:inline-flex] [align-items:center] [justify-content:center] [border-radius:999px] [background:var(--primary-strong)] [color:#111114] [font-size:0.65rem] [font-weight:750] [line-height:1]"
                    aria-label={t("nav.reviewsDue", { count: formattedDueCount ?? dueCount })}
                  >
                    {dueCount > 99 ? formatNumber(locale, 99) + "+" : formattedDueCount}
                  </span>
                ) : null}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {hasOpenedAddSheet ? (
        <MobileAddVocabularySheet
          isOpen={isAddSheetOpen}
          onClose={() => setIsAddSheetOpen(false)}
          translationPreference={translationPreference}
        />
      ) : null}
    </>
  );
}
