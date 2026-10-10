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
      className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:uv-padding-e76eae74a0 uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:uv-transition-bce4a9f76d uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:uv-v14ef0811e9:text-uv-text uv-min940:uv-v14ef0811e9:bg-uv-cbdfd7cd038 uv-min-height-e45618b383 " + (isActive ? "is-active" : "")}
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
          className="review-nav-badge min-w-5 h-5 ml-auto uv-padding-5335c6828f inline-flex items-center justify-center rounded-uv-red9ab892c5 bg-uv-primary-strong text-uv-c39fe93f0de text-uv-f2311a7d95c uv-weight-750 uv-line-height-356a192b79"
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
      <header className="mobile-header fixed uv-inset-b8cc3b4645 uv-z-index-e1822db470 uv-height-30fe4268f5 uv-padding-ce098359fd flex items-center justify-between uv-border-bottom-d07d4bb668 bg-uv-c06b07fb064 uv-backdrop-filter-ee1e0ecb9e uv-min940:hidden">
        <Link href="/vocabulary" className="brand inline-flex items-center gap-2.25 uv-weight-620 uv-letter-spacing-235f37bdea" aria-label={t("nav.brandWords")}>
          <span className="brand-mark w-7.5 h-7.5 grid uv-place-items-305047e96e rounded-uv-r933cc73310 uv-background-6217892e56 uv-color-528cef87d0 uv-box-shadow-a1161bbdbc">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions flex gap-2">
          <button
            type="button"
            className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383"
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
          <Link href="/settings" className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383" aria-label={t("nav.settings")}>
            <AnimatedAppIcon name="settings" size={19} />
          </Link>
        </div>
      </header>

      <aside className="desktop-sidebar hidden uv-min940:fixed uv-min940:uv-inset-8a0ae26192 uv-min940:uv-z-index-e1822db470 uv-min940:w-60.5 uv-min940:flex uv-min940:flex-col uv-min940:uv-padding-3e6175ce44 uv-min940:uv-border-right-8d7f82f403 uv-min940:bg-uv-c22c77a4653">
        <Link href="/vocabulary" className="brand sidebar-brand inline-flex items-center gap-2.25 uv-weight-620 uv-letter-spacing-235f37bdea uv-min940:uv-padding-cf4e33fcb4" aria-label={t("nav.brandWords")}>
          <span className="brand-mark w-7.5 h-7.5 grid uv-place-items-305047e96e rounded-uv-r933cc73310 uv-background-6217892e56 uv-color-528cef87d0 uv-box-shadow-a1161bbdbc">U</span>
          <span>U-Vocab</span>
        </Link>

        <nav className="sidebar-nav uv-min940:flex uv-min940:flex-col uv-min940:gap-1.25" aria-label={t("nav.main")}>
          <p className="nav-eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold uv-min940:uv-padding-6338b38ab4">{t("common.learn")}</p>
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

        <div className="sidebar-secondary mt-auto flex flex-col gap-1.25 pt-6 uv-border-top-8d7f82f403 uv-v62842742dd:mt-2.5">
          <p className="nav-eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold uv-min940:uv-padding-6338b38ab4">{t("common.insights")}</p>
          {insights.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:uv-padding-e76eae74a0 uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:uv-transition-bce4a9f76d uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:uv-v14ef0811e9:text-uv-text uv-min940:uv-v14ef0811e9:bg-uv-cbdfd7cd038 uv-min-height-e45618b383 " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <p className="nav-eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold uv-min940:uv-padding-6338b38ab4">{t("common.account")}</p>
          {system.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link uv-min940:min-h-10.5 uv-min940:flex uv-min940:items-center uv-min940:gap-2.75 uv-min940:uv-padding-e76eae74a0 uv-min940:rounded-uv-r0939007802 uv-min940:text-uv-text-muted uv-min940:text-uv-f9601fe81a7 uv-min940:uv-transition-bce4a9f76d uv-min940:hover:text-uv-text-soft uv-min940:hover:bg-uv-surface uv-min940:uv-v14ef0811e9:text-uv-text uv-min940:uv-v14ef0811e9:bg-uv-cbdfd7cd038 uv-min-height-e45618b383 " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <AnimatedAppIcon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <Link href="/vocabulary/new" className="sidebar-add uv-min940:min-h-11 uv-min940:mt-auto uv-min940:flex uv-min940:items-center uv-min940:justify-center uv-min940:gap-2 uv-min940:rounded-uv-r233710a71e uv-min940:bg-uv-text uv-min940:text-uv-c39fe93f0de uv-min940:text-uv-f8bb1a95a21 uv-min940:uv-weight-650">
            <AnimatedAppIcon name="add" size={18} />
            {t("nav.addWord")}
          </Link>
        </div>
      </aside>

      {!isPrimary && owner.section ? (
        <nav className="section-context-nav hidden uv-min940:fixed uv-min940:uv-z-index-af3e133428 uv-min940:top-6 uv-min940:right-9 uv-min940:flex uv-min940:items-center uv-min940:gap-1.75 uv-min940:uv-max-width-f65a3e8425 uv-min940:uv-padding-1eec12de18 uv-min940:uv-border-8d7f82f403 uv-min940:rounded-uv-red9ab892c5 uv-min940:bg-uv-c20ef9fea58 uv-min940:uv-backdrop-filter-bab5c12c11 uv-min940:text-uv-text-muted uv-min940:text-uv-f78eb7000a9 uv-min940:uv-v99777dc5b4:text-uv-primary-strong uv-min940:uv-v99777dc5b4:font-semibold uv-min940:uv-veda02a0adb:overflow-hidden uv-min940:uv-veda02a0adb:text-uv-text-soft uv-min940:uv-veda02a0adb:uv-text-overflow-900198081b uv-min940:uv-veda02a0adb:whitespace-nowrap" aria-label={t("nav.sectionContext")}>
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

      <nav className="mobile-bottom-nav fixed uv-z-index-e1822db470 uv-inset-1c88d7d0e2 grid uv-grid-template-columns-50678a67eb gap-0.5 p-2.25 uv-border-fbc4d8b2cf rounded-uv-r998b02c207 bg-uv-cd13dd822fd uv-box-shadow-b29865e499 uv-backdrop-filter-220f98ca33 uv-min940:hidden" aria-label={t("nav.mobile")}>
        {primary.map((item) => {
          const isActive = sectionForPath(pathname) === item.section;
          const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;
          return (
            <Link
              key={item.section}
              href={item.href}
              className={"mobile-nav-item flex flex-col items-center justify-center gap-1 rounded-uv-rd65225386d text-uv-text-muted text-uv-ff7862da171 uv-transition-be257b436b active:uv-transform-6161c738a7 uv-v14ef0811e9:text-uv-primary uv-min-height-e45618b383 " + (isActive ? "is-active" : "")}
              aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
            >
              <span className="mobile-nav-icon relative inline-flex uv-v5c2228c20d:absolute uv-v5c2228c20d:-top-2 uv-v5c2228c20d:left-3.5 uv-v5c2228c20d:min-w-4 uv-v5c2228c20d:h-4 uv-v5c2228c20d:px-0.75 uv-v5c2228c20d:text-uv-fd95043f679">
                <AnimatedAppIcon name={item.icon} size={25} />
                {item.section === "review" && dueCount ? (
                  <span
                    className="review-nav-badge min-w-5 h-5 ml-auto uv-padding-5335c6828f inline-flex items-center justify-center rounded-uv-red9ab892c5 bg-uv-primary-strong text-uv-c39fe93f0de text-uv-f2311a7d95c uv-weight-750 uv-line-height-356a192b79"
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
