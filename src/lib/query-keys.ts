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
    detail: (lexemeId: string) => ["word", lexemeId] as const,
  },
  review: {
    all: ["review"] as const,
    queue: (scope: string) => ["review", scope, "queue"] as const,
  },
  mistakes: {
    all: ["mistakes"] as const,
    open: () => ["mistakes", "open"] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    list: () => ["recommendations", "list"] as const,
  },
  writing: {
    all: ["writing"] as const,
    session: (sessionId: string) => ["writing", sessionId] as const,
  },
  conversation: {
    all: ["conversation"] as const,
    session: (sessionId: string) => ["conversation", sessionId] as const,
  },
  usage: {
    all: ["usage"] as const,
    filtered: (period: string, filters: Record<string, string>) =>
      ["usage", period, normalizedFilters(filters)] as const,
  },
} as const;

export { normalizedFilters as normalizeQueryFilters };
