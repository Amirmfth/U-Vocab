export const READING_TARGETS_PER_LENGTH = { SHORT: 5, MEDIUM: 10, LONG: 15 } as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsReadingTarget(content: string, lemma: string) {
  return new RegExp(
    "(?<![\\p{L}\\p{N}_])" + escapeRegex(lemma) + "(?![\\p{L}\\p{N}_])",
    "iu",
  ).test(content);
}
