export const FIRST_USE_GUIDES = {
  review: { id: "review-basics", version: 1 },
  grammar: { id: "grammar-evidence", version: 1 },
  practice: { id: "practice-modes", version: 1 },
  conversation: { id: "conversation-input", version: 1 },
  progress: { id: "progress-estimates", version: 1 },
} as const;

export type FirstUseGuide = (typeof FIRST_USE_GUIDES)[keyof typeof FIRST_USE_GUIDES];
