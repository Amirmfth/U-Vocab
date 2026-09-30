import type { PartOfSpeech } from "@prisma/client";
import type { LexiconLanguageAdapter } from "./normalization";

export function canonicalLexemeKey(
  adapter: LexiconLanguageAdapter,
  lemma: string,
  partOfSpeech: PartOfSpeech,
) {
  return [adapter.languageCode, adapter.normalizeCanonical(lemma, partOfSpeech), partOfSpeech].join(":");
}

export function classifyLexemeIds(ids: string[]) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return { kind: "miss" as const, id: null };
  if (unique.length > 1) return { kind: "ambiguous" as const, id: null };
  return { kind: "unique" as const, id: unique[0] };
}

export function safeCanonicalFill(
  current: {
    article: string | null;
    plural: string | null;
    cefrLevel: string | null;
  },
  candidate: {
    article?: string | null;
    plural?: string | null;
    cefrLevel?: string | null;
  },
) {
  const patch: { article?: string; plural?: string; cefrLevel?: string } = {};
  if (!current.article && candidate.article) patch.article = candidate.article;
  if (!current.plural && candidate.plural) patch.plural = candidate.plural;
  if (!current.cefrLevel && candidate.cefrLevel) patch.cefrLevel = candidate.cefrLevel;
  return patch;
}
