"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, BookOpenText, Brain, FileUp, GitCompareArrows, Home, Layers3, Network, Plus, ScanText,
  Settings, Sparkles, Star, TimerReset, TrendingUp, TriangleAlert, type LucideIcon,
} from "lucide-react";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/vocabulary", label: "Words", icon: BookOpen },
  { href: "/review", label: "Review", icon: Brain },
  { href: "/practice", label: "Practice", icon: Sparkles },
];
const explore = [
  { href: "/focus", label: "Focus", icon: TimerReset },
  { href: "/recommendations", label: "Recommendations", icon: Star },
  { href: "/universe", label: "Universe", icon: Network },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/topic-packs", label: "Topic packs", icon: Layers3 },
  { href: "/stories", label: "Stories", icon: BookOpenText },
  { href: "/read", label: "Reading", icon: ScanText },
  { href: "/import", label: "Import", icon: FileUp },
];
const more = [
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/mistakes", label: "Mistakes", icon: TriangleAlert },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function active(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ pathname, href, label, Icon }: {
  pathname: string; href: string; label: string; Icon: LucideIcon;
}) {
  const isActive = active(pathname, href);
  return (
    <Link href={href} className={"nav-link " + (isActive ? "is-active" : "")}
      aria-current={isActive ? "page" : undefined}>
      <Icon size={18} /><span>{label}</span>
    </Link>
  );
}

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <>
      <header className="mobile-header">
        <Link href="/" className="brand" aria-label="U-Vocab home">
          <span className="brand-mark">U</span><span>U-Vocab</span>
        </Link>
        <div className="mobile-header-actions">
          <Link href="/vocabulary/new" className="icon-button" aria-label="Add word"><Plus size={20} /></Link>
          <Link href="/settings" className="icon-button" aria-label="Settings"><Settings size={19} /></Link>
        </div>
      </header>

      <aside className="desktop-sidebar">
        <Link href="/" className="brand sidebar-brand">
          <span className="brand-mark">U</span><span>U-Vocab</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">LEARN</p>
          {primary.map((item) => <NavLink key={item.href} pathname={pathname} href={item.href} label={item.label} Icon={item.icon} />)}
          <p className="nav-eyebrow nav-section-gap">EXPLORE</p>
          {explore.map((item) => <NavLink key={item.href} pathname={pathname} href={item.href} label={item.label} Icon={item.icon} />)}
          <p className="nav-eyebrow nav-section-gap">MORE</p>
          {more.map((item) => <NavLink key={item.href} pathname={pathname} href={item.href} label={item.label} Icon={item.icon} />)}
        </nav>
        <Link href="/vocabulary/new" className="sidebar-add"><Plus size={18} />Add word</Link>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primary.map((item) => {
          const Icon = item.icon; const isActive = active(pathname, item.href);
          return (
            <Link key={item.href} href={item.href}
              className={"mobile-nav-item " + (isActive ? "is-active" : "")}
              aria-current={isActive ? "page" : undefined}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} /><span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
