import type { MessageKey } from "@/i18n/core";

export const PRACTICE_HUB_DESTINATIONS = [
  { href: "/practice?drill=1", labelKey: "practice.vocabulary" },
  { href: "/writing", labelKey: "nav.writing" },
  { href: "/reading", labelKey: "nav.reading" },
  { href: "/conversation", labelKey: "practice.speaking" },
] as const satisfies ReadonlyArray<{ href: string; labelKey: MessageKey }>;
