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
      className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:padding-0-11px uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:transition-background-150ms-ease-color-150ms-ease uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:in-is-active:text-uv-text uv-min940:in-is-active:bg-uv-cbdfd7cd038 min-height-tap-target " + (isActive ? "is-active" : "")}
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
          className="review-nav-badge min-w-5 h-5 ml-auto padding-0-5px inline-flex items-center justify-center rounded-uv-red9ab892c5 bg-uv-primary-strong text-uv-c39fe93f0de text-uv-f2311a7d95c font-750 line-height-1"
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
      <header className="mobile-header fixed inset-0-0-auto-0 z-index-50 height-calc-60px-env-safe-area-inset-top padding-env-safe-area-inset-top-16px-0 flex items-center justify-between border-1px-solid-rgb-255-255-255-0p06 bg-uv-c06b07fb064 backdrop-filter-blur-18px uv-min940:hidden">
        <Link href="/vocabulary" className="brand inline-flex items-center gap-2.25 font-620 letter-spacing-0p02em-2" aria-label={t("nav.brandWords")}>
          <span className="brand-mark w-7.5 h-7.5 grid place-items-center rounded-uv-r933cc73310 bg-linear-gradient-145deg-primary-strong-hex-6657ee color-white box-shadow-inset-0-1px-0-rgb-255-255-255-0p25">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions flex gap-2">
          <button
            type="button"
            className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft min-height-tap-target"
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
          <Link href="/settings" className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft min-height-tap-target" aria-label={t("nav.settings")}>
            <AnimatedAppIcon name="settings" size={19} />
          </Link>
        </div>
      </header>

      <aside className="desktop-sidebar hidden uv-min940:fixed uv-min940:inset-0-auto-0-0 uv-min940:z-index-50 uv-min940:w-60.5 uv-min940:flex uv-min940:flex-col uv-min940:padding-24px-16px uv-min940:border-1px-solid-border-4 uv-min940:bg-uv-c22c77a4653">
        <Link href="/vocabulary" className="brand sidebar-brand inline-flex items-center gap-2.25 font-620 letter-spacing-0p02em-2 uv-min940:padding-0-8px-24px" aria-label={t("nav.brandWords")}>
          <span className="brand-mark w-7.5 h-7.5 grid place-items-center rounded-uv-r933cc73310 bg-linear-gradient-145deg-primary-strong-hex-6657ee color-white box-shadow-inset-0-1px-0-rgb-255-255-255-0p25">U</span>
          <span>U-Vocab</span>
        </Link>

        <nav className="sidebar-nav uv-min940:flex uv-min940:flex-col uv-min940:gap-1.25" aria-label={t("nav.main")}>
          <p className="nav-eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold uv-min940:padding-0-10px-7px">{t("common.learn")}</p>
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

        <div className="sidebar-secondary mt-auto flex flex-col gap-1.25 pt-6 border-1px-solid-border-3 in-sidebar-add:mt-2.5">
          <p className="nav-eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold uv-min940:padding-0-10px-7px">{t("common.insights")}</p>
          {insights.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:padding-0-11px uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:transition-background-150ms-ease-color-150ms-ease uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:in-is-active:text-uv-text uv-min940:in-is-active:bg-uv-cbdfd7cd038 min-height-tap-target " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <p className="nav-eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold uv-min940:padding-0-10px-7px">{t("common.account")}</p>
          {system.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:padding-0-11px uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:transition-background-150ms-ease-color-150ms-ease uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:in-is-active:text-uv-text uv-min940:in-is-active:bg-uv-cbdfd7cd038 min-height-tap-target " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <Link href="/vocabulary/new" className="sidebar-add uv-min940:min-h-11 uv-min940:mt-auto uv-min940:flex uv-min940:items-center uv-min940:justify-center uv-min940:gap-2 uv-min940:rounded-uv-r233710a71e uv-min940:bg-uv-text uv-min940:text-uv-c39fe93f0de uv-min940:text-uv-f8bb1a95a21 uv-min940:font-650">
            <AnimatedAppIcon name="add" size={18} />
            {t("nav.addWord")}
          </Link>
        </div>
      </aside>

      {!isPrimary && owner.section ? (
        <nav className="section-context-nav hidden uv-min940:fixed uv-min940:z-index-40 uv-min940:top-6 uv-min940:right-9 uv-min940:flex uv-min940:items-center uv-min940:gap-1.75 uv-min940:max-width-calc-100vw-330px uv-min940:padding-7px-10px uv-min940:border-1px-solid-border-2 uv-min940:rounded-uv-red9ab892c5 uv-min940:bg-uv-c20ef9fea58 uv-min940:backdrop-filter-blur-12px uv-min940:text-uv-text-muted uv-min940:text-uv-f78eb7000a9 uv-min940:in-a:text-uv-primary-strong uv-min940:in-a:font-semibold uv-min940:in-strong-2:overflow-hidden uv-min940:in-strong-2:text-uv-text-soft uv-min940:in-strong-2:text-overflow-ellipsis uv-min940:in-strong-2:whitespace-nowrap" aria-label={t("nav.sectionContext")}>
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

      <nav className="mobile-bottom-nav fixed z-index-50 inset-auto-10px-max-10px-env-safe-area-inset-bottom-10px grid grid-template-columns-repeat-4-1fr gap-0.5 p-2.25 border-1px-solid-rgb-255-255-255-0p08 rounded-uv-r998b02c207 bg-uv-cd13dd822fd box-shadow-0-18px-50px-rgb-0-0-0-0p4 backdrop-filter-blur-20px uv-min940:hidden" aria-label={t("nav.mobile")}>
        {primary.map((item) => {
          const isActive = sectionForPath(pathname) === item.section;
          const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;
          return (
            <Link
              key={item.section}
              href={item.href}
              className={"mobile-nav-item flex flex-col items-center justify-center gap-1 rounded-uv-rd65225386d text-uv-text-muted text-uv-ff7862da171 transition-color-160ms-ease-transform-160ms-ease active:transform-scale-0p96 in-is-active:text-uv-primary min-height-tap-target " + (isActive ? "is-active" : "")}
              aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
            >
              <span className="mobile-nav-icon relative inline-flex in-review-nav-badge:absolute in-review-nav-badge:-top-2 in-review-nav-badge:left-3.5 in-review-nav-badge:min-w-4 in-review-nav-badge:h-4 in-review-nav-badge:px-0.75 in-review-nav-badge:text-uv-fd95043f679">
                <AnimatedAppIcon name={item.icon} size={25} />
                {item.section === "review" && dueCount ? (
                  <span
                    className="review-nav-badge min-w-5 h-5 ml-auto padding-0-5px inline-flex items-center justify-center rounded-uv-red9ab892c5 bg-uv-primary-strong text-uv-c39fe93f0de text-uv-f2311a7d95c font-750 line-height-1"
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
