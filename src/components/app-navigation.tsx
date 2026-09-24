"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
}: {
  pathname: string;
  section: LearningSection;
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  const isActive = sectionForPath(pathname) === section;
  return (
    <Link
      href={href}
      className={"nav-link " + (isActive ? "is-active" : "")}
      aria-current={isActive ? (pathname === href ? "page" : "location") : undefined}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export function AppNavigation() {
  const pathname = usePathname();
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
          <Link
            href="/vocabulary/new"
            className="icon-button"
            aria-label="Add word"
          >
            <Plus size={20} />
          </Link>
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
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
