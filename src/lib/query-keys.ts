export type VocabularyQueryFilters = {
  q?: string;
  status?: string;
  pos?: string;
  level?: string;
  topic?: string;
  collection?: string;
  relation?: string;
};

function normalizedFilters(filters: VocabularyQueryFilters = {}) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, value?.trim()] as const)
      .filter(([, value]) => value && value !== "ALL")
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export const queryKeys = {
  vocabulary: {
    all: ["vocabulary"] as const,
    list: (scope: string, filters: VocabularyQueryFilters = {}) =>
      ["vocabulary", scope, normalizedFilters(filters)] as const,
  },
  word: {
    all: ["word"] as const,
    detail: (scope: string, lexemeId: string) => ["word", scope, lexemeId] as const,
    conjugation: (scope: string, lexemeId: string) =>
      ["word", scope, lexemeId, "conjugation"] as const,
  },
  review: {
    all: ["review"] as const,
    queue: (scope: string) => ["review", scope, "queue"] as const,
  },
  mistakes: {
    all: ["mistakes"] as const,
    open: (scope: string) => ["mistakes", scope, "open"] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    list: (scope: string) => ["recommendations", scope, "list"] as const,
  },
  writing: {
    all: ["writing"] as const,
    session: (scope: string, sessionId: string) => ["writing", scope, sessionId] as const,
  },
  conversation: {
    all: ["conversation"] as const,
    session: (scope: string, sessionId: string) => ["conversation", scope, sessionId] as const,
  },
  usage: {
    all: ["usage"] as const,
    filtered: (scope: string, period: string, filters: Record<string, string>) =>
      ["usage", scope, period, normalizedFilters(filters)] as const,
  },
} as const;

export { normalizedFilters as normalizeQueryFilters };
