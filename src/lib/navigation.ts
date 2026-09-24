export type LearningSection = "home" | "words" | "review" | "practice";

export const LEARNING_SECTIONS = {
  home: { href: "/", label: "Home" },
  words: { href: "/vocabulary", label: "Words" },
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
  { prefix: "/vocabulary", section: "words", label: "My words" },
  { prefix: "/topic-packs", section: "words", label: "Topic packs" },
  { prefix: "/recommendations", section: "words", label: "Recommendations" },
  { prefix: "/compare", section: "words", label: "Compare" },
  { prefix: "/universe", section: "words", label: "Universe" },

  { prefix: "/review", section: "review", label: "Standard review" },
  { prefix: "/mistakes", section: "review", label: "Mistakes" },
  { prefix: "/rescue", section: "review", label: "Rescue words" },
  { prefix: "/focus", section: "review", label: "Focus session" },

  { prefix: "/practice", section: "practice", label: "Practice" },
  { prefix: "/writing", section: "practice", label: "Writing", group: "Writing" },
  { prefix: "/read", section: "practice", label: "Reading", group: "Reading" },
  { prefix: "/stories", section: "practice", label: "Stories", group: "Reading" },
  { prefix: "/conversation", section: "practice", label: "Conversation", group: "Speaking" },
  { prefix: "/missions", section: "practice", label: "Missions", group: "Speaking" },
  { prefix: "/battles", section: "practice", label: "Battles" },

  { prefix: "/progress", section: "home", label: "Full progress" },
  { prefix: "/settings", section: null, label: "Settings" },
  { prefix: "/usage", section: null, label: "AI Usage" },
];

export function routeOwner(pathname: string) {
  if (pathname === "/") {
    return { section: "home" as const, label: "Home", group: undefined };
  }

  const match = ROUTE_OWNERS
    .filter(
      (route) =>
        pathname === route.prefix || pathname.startsWith(route.prefix + "/"),
    )
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  return match ?? { section: null, label: "U-Vocab", group: undefined };
}

export function sectionForPath(pathname: string) {
  return routeOwner(pathname).section;
}
