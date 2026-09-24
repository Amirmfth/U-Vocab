"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BookOpenText,
  Brain,
  CircleGauge,
  Home,
  Layers3,
  Plus,
  Settings,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/vocabulary", label: "Words", icon: BookOpen },
  { href: "/review", label: "Review", icon: Brain },
  { href: "/practice", label: "Practice", icon: Sparkles },
  { href: "/usage", label: "Usage", icon: BarChart3 },
];

const secondary = [
  { href: "/topic-packs", label: "Topic packs", icon: Layers3 },
  { href: "/stories", label: "Stories", icon: BookOpenText },
  { href: "/mistakes", label: "Mistakes", icon: TriangleAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];

function active(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="mobile-header">
        <Link href="/" className="brand" aria-label="U-Vocab home">
          <span className="brand-mark">U</span>
          <span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions">
          <Link href="/vocabulary/new" className="icon-button" aria-label="Add vocabulary">
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
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link " + (active(pathname, item.href) ? "is-active" : "")}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <p className="nav-eyebrow nav-section-gap">SYSTEM</p>
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-link " + (active(pathname, item.href) ? "is-active" : "")}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link href="/vocabulary/new" className="sidebar-add">
          <Plus size={18} />
          Add lexical unit
        </Link>

        <div className="sidebar-foot">
          <CircleGauge size={16} />
          <span>Neon + OpenAI</span>
        </div>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primary.map((item) => {
          const Icon = item.icon;
          const isActive = active(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={"mobile-nav-item " + (isActive ? "is-active" : "")}
              aria-current={isActive ? "page" : undefined}
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
