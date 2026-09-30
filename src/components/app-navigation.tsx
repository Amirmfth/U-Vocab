"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  GraduationCap,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
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

const primaryMeta: Record<LearningSection, { labelKey: MessageKey; icon: LucideIcon }> = {
  words: { labelKey: "nav.words", icon: BookOpen },
  grammar: { labelKey: "nav.grammar", icon: GraduationCap },
  review: { labelKey: "nav.review", icon: Brain },
  practice: { labelKey: "nav.practice", icon: Sparkles },
};

const primary = PRIMARY_LEARNING_SECTIONS.map((section) => ({
  section,
  href: LEARNING_SECTIONS[section].href,
  ...primaryMeta[section],
}));

const insights: Array<{ href: string; labelKey: MessageKey; icon: LucideIcon }> = [
  { href: "/progress", labelKey: "nav.fullProgress", icon: BarChart3 },
];

const system: Array<{ href: string; labelKey: MessageKey; icon: LucideIcon }> = [
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
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
  Icon,
  dueCount,
}: {
  pathname: string;
  section: LearningSection;
  href: string;
  label: string;
  Icon: LucideIcon;
  dueCount?: number | null;
}) {
  const isActive = sectionForPath(pathname) === section;
  const { locale, t } = useI18n();
  const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;

  return (
    <Link
      href={href}
      className={"nav-link " + (isActive ? "is-active" : "")}
      aria-current={isActive ? (pathname === href ? "page" : "location") : undefined}
      aria-label={
        section === "review" && dueCount
          ? t("nav.reviewDue", { count: formattedDueCount ?? dueCount })
          : undefined
      }
    >
      <Icon size={18} />
      <span>{label}</span>
      {section === "review" && dueCount ? (
        <span
          className="review-nav-badge"
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
      <header className="mobile-header">
        <Link href="/vocabulary" className="brand" aria-label={t("nav.brandWords")}>
          <span className="brand-mark">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={t("nav.addWord")}
            aria-expanded={isAddSheetOpen}
            aria-controls="mobile-add-sheet"
            onClick={() => {
              setHasOpenedAddSheet(true);
              setIsAddSheetOpen(true);
            }}
          >
            <Plus size={20} />
          </button>
          <Link href="/settings" className="icon-button" aria-label={t("nav.settings")}>
            <Settings size={19} />
          </Link>
        </div>
      </header>

      <aside className="desktop-sidebar">
        <Link href="/vocabulary" className="brand sidebar-brand" aria-label={t("nav.brandWords")}>
          <span className="brand-mark">U</span>
          <span>U-Vocab</span>
        </Link>

        <nav className="sidebar-nav" aria-label={t("nav.main")}>
          <p className="nav-eyebrow">{t("common.learn")}</p>
          {primary.map((item) => (
            <NavLink
              key={item.section}
              pathname={pathname}
              section={item.section}
              href={item.href}
              label={t(item.labelKey)}
              Icon={item.icon}
              dueCount={item.section === "review" ? dueCount : null}
            />
          ))}
        </nav>

        <div className="sidebar-secondary">
          <p className="nav-eyebrow">{t("common.insights")}</p>
          {insights.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <Icon size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <p className="nav-eyebrow">{t("common.account")}</p>
          {system.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link " + (isActive ? "is-active" : "")}
                aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
              >
                <Icon size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <Link href="/vocabulary/new" className="sidebar-add">
            <Plus size={18} />
            {t("nav.addWord")}
          </Link>
        </div>
      </aside>

      {!isPrimary && owner.section ? (
        <nav className="section-context-nav" aria-label={t("nav.sectionContext")}>
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

      <nav className="mobile-bottom-nav" aria-label={t("nav.mobile")}>
        {primary.map((item) => {
          const Icon = item.icon;
          const isActive = sectionForPath(pathname) === item.section;
          const formattedDueCount = dueCount ? formatNumber(locale, dueCount) : null;
          return (
            <Link
              key={item.section}
              href={item.href}
              className={"mobile-nav-item " + (isActive ? "is-active" : "")}
              aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
            >
              <span className="mobile-nav-icon">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {item.section === "review" && dueCount ? (
                  <span
                    className="review-nav-badge"
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
