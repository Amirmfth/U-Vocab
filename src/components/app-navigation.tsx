"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Home,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  LEARNING_SECTIONS,
  routeOwner,
  sectionForPath,
  type LearningSection,
} from "@/lib/navigation";

const MobileAddVocabularySheet = dynamic(
  () => import("@/components/mobile-add-vocabulary-sheet").then((module) => module.MobileAddVocabularySheet),
  { ssr: false },
);

const primary: Array<{
  section: LearningSection;
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { section: "home", ...LEARNING_SECTIONS.home, icon: Home },
  { section: "words", ...LEARNING_SECTIONS.words, icon: BookOpen },
  { section: "review", ...LEARNING_SECTIONS.review, icon: Brain },
  { section: "practice", ...LEARNING_SECTIONS.practice, icon: Sparkles },
];

const system = [
  { href: "/usage", label: "AI Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
  return (
    <Link
      href={href}
      className={"nav-link " + (isActive ? "is-active" : "")}
      aria-current={isActive ? (pathname === href ? "page" : "location") : undefined}
      aria-label={section === "review" && dueCount ? `Review, ${dueCount} due` : undefined}
    >
      <Icon size={18} />
      <span>{label}</span>
      {section === "review" && dueCount ? <span className="review-nav-badge" title={`${dueCount} reviews due`}>{dueCount > 99 ? "99+" : dueCount}</span> : null}
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
    pathname === "/" ||
    pathname === "/vocabulary" ||
    pathname === "/review" ||
    pathname === "/practice";

  return (
    <>
      <header className="mobile-header">
        <Link href="/" className="brand" aria-label="U-Vocab home">
          <span className="brand-mark">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Add word"
            aria-expanded={isAddSheetOpen}
            aria-controls="mobile-add-sheet"
            onClick={() => {
              setHasOpenedAddSheet(true);
              setIsAddSheetOpen(true);
            }}
          >
            <Plus size={20} />
          </button>
          <Link href="/settings" className="icon-button" aria-label="Settings">
            <Settings size={19} />
          </Link>
        </div>
      </header>

      <aside className="desktop-sidebar">
        <Link href="/" className="brand sidebar-brand">
          <span className="brand-mark">U</span>
          <span>U-Vocab</span>
        </Link>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">LEARN</p>
          {primary.map((item) => (
            <NavLink
              key={item.section}
              pathname={pathname}
              section={item.section}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              dueCount={item.section === "review" ? dueCount : null}
            />
          ))}
        </nav>

        <div className="sidebar-secondary">
          <p className="nav-eyebrow">ACCOUNT</p>
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
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link href="/vocabulary/new" className="sidebar-add">
            <Plus size={18} />
            Add word
          </Link>
        </div>
      </aside>

      {!isPrimary && owner.section ? (
        <nav className="section-context-nav" aria-label="Section context">
          <Link href={LEARNING_SECTIONS[owner.section].href}>
            {LEARNING_SECTIONS[owner.section].label}
          </Link>
          <span aria-hidden="true">/</span>
          {owner.group ? (
            <>
              <span>{owner.group}</span>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <strong>{owner.label}</strong>
        </nav>
      ) : null}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primary.map((item) => {
          const Icon = item.icon;
          const isActive = sectionForPath(pathname) === item.section;
          return (
            <Link
              key={item.section}
              href={item.href}
              className={"mobile-nav-item " + (isActive ? "is-active" : "")}
              aria-current={isActive ? (pathname === item.href ? "page" : "location") : undefined}
            >
              <span className="mobile-nav-icon">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {item.section === "review" && dueCount ? <span className="review-nav-badge" aria-label={`${dueCount} reviews due`}>{dueCount > 99 ? "99+" : dueCount}</span> : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {hasOpenedAddSheet ? <MobileAddVocabularySheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        translationPreference={translationPreference}
      /> : null}
    </>
  );
}
