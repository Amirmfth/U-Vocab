export type LearningSection = "words" | "grammar" | "review" | "practice";

export const LEARNING_SECTIONS = {
  words: { href: "/vocabulary", label: "Words" },
  grammar: { href: "/grammar", label: "Grammar" },
  review: { href: "/review", label: "Review" },
  practice: { href: "/practice", label: "Practice" },
} as const;

type RouteOwner = {
  prefix: string;
  section: LearningSection | null;
  label: string;
  group?: string;
};

const ROUTE_OWNERS: RouteOwner[] = [
  { prefix: "/vocabulary/new", section: "words", label: "Add word" },
  { prefix: "/vocabulary", section: "words", label: "My words" },

  { prefix: "/grammar", section: "grammar", label: "Grammar" },

  { prefix: "/review", section: "review", label: "Standard review" },
  { prefix: "/mistakes", section: "review", label: "Mistakes" },
  { prefix: "/rescue", section: "review", label: "Rescue words" },

  { prefix: "/practice", section: "practice", label: "Practice" },
  { prefix: "/writing", section: "practice", label: "Writing" },
  { prefix: "/reading", section: "practice", label: "Reading" },
  { prefix: "/stories", section: "practice", label: "Reading", group: "Reading" },
  { prefix: "/read", section: "practice", label: "Legacy reading", group: "Reading" },
  { prefix: "/conversation", section: "practice", label: "Conversation", group: "Speaking" },
  { prefix: "/battles", section: "practice", label: "Battles" },

  { prefix: "/progress", section: null, label: "Full progress" },
  { prefix: "/settings", section: null, label: "Settings" },
  { prefix: "/usage", section: null, label: "AI Usage" },
];

export function routeOwner(pathname: string) {
  const path = pathname.split(/[?#]/u)[0] || "/";

  if (path === "/") {
    return { section: "words" as const, label: "My words", group: undefined };
  }

  const match = ROUTE_OWNERS
    .filter(
      (route) =>
        path === route.prefix || path.startsWith(route.prefix + "/"),
    )
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match ?? { section: null, label: "U-Vocab", group: undefined };
}

export function sectionForPath(pathname: string) {
  return routeOwner(pathname).section;
}
