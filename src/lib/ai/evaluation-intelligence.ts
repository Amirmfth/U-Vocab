import { z } from "zod";

export const evaluatorMistakeTypeSchema = z.enum([
  "ARTICLE",
  "CASE",
  "PREPOSITION",
  "REFLEXIVE",
  "COLLOCATION",
  "ADJECTIVE_ENDING",
  "VERB_POSITION",
  "WORD_ORDER",
  "TENSE",
  "CONJUGATION",
  "PRONOUN",
  "AGREEMENT",
  "RELATIVE_CLAUSE",
  "PASSIVE",
  "SUBJUNCTIVE",
  "WORD_CHOICE",
  "WORD_FORM",
  "SPELLING",
  "OTHER",
]);

export const errorCauseSchema = z.enum([
  "TYPO",
  "ORTHOGRAPHY_GAP",
  "MORPHOLOGY_GAP",
  "GRAMMAR_GAP",
  "LEXICAL_CONFUSION",
  "SEMANTIC_CONFUSION",
  "PARTIAL_RECALL",
  "KNOWLEDGE_GAP",
  "ATTENTION_SLIP",
  "AMBIGUOUS",
  "OTHER",
]);

export const interventionSchema = z.enum([
  "NONE",
  "RETRY",
  "SHORT_HINT",
  "SHOW_CORRECT_FORM",
  "CONTRAST_EXAMPLE",
  "GRAMMAR_REMINDER",
  "COLLOCATION_REMINDER",
  "MINIMAL_PAIR",
  "EXAMPLE_SENTENCE",
  "TARGETED_MICRO_DRILL",
  "DEFER_TO_REVIEW",
]);

export const masteryEvidenceSignalSchema = z.enum([
  "POSITIVE",
  "NEGATIVE",
  "NONE",
]);

export const masteryEvidenceSchema = z.object({
  recognition: masteryEvidenceSignalSchema,
  meaningRecall: masteryEvidenceSignalSchema,
  production: masteryEvidenceSignalSchema,
  contextualUsage: masteryEvidenceSignalSchema,
});

export const evaluatorMistakeSchema = z.object({
  type: evaluatorMistakeTypeSchema,
  expected: z.string().nullable(),
  actual: z.string().nullable(),
  explanation: z.string().max(700),
  cause: errorCauseSchema,
  confidence: z.number().min(0).max(1),
  intervention: interventionSchema,
});

export type ErrorCause = z.infer<typeof errorCauseSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type MasteryEvidence = z.infer<typeof masteryEvidenceSchema>;

export const EVALUATOR_HIGH_CONFIDENCE = 0.8;
export const EVALUATOR_MEDIUM_CONFIDENCE = 0.6;

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().trim();
}

export function levenshteinDistance(a: string, b: string) {
  const left = Array.from(normalize(a));
  const right = Array.from(normalize(b));
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      const substitution = diagonal + (left[i - 1] === right[j - 1] ? 0 : 1);
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, substitution);
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function localErrorSignal(expected: string | undefined, actual: string) {
  if (!expected?.trim() || !actual.trim()) return { kind: "UNKNOWN" as const };
  const distance = levenshteinDistance(expected, actual);
  const longest = Math.max(Array.from(normalize(expected)).length, Array.from(normalize(actual)).length, 1);
  const ratio = distance / longest;
  return {
    kind: ratio <= 0.18 && distance <= 2 ? ("NEAR_TYPO" as const) : ("DISTANT" as const),
    editDistance: distance,
    normalizedDistance: Math.round(ratio * 1000) / 1000,
  };
}

export function evidenceStrength(confidence: number) {
  if (confidence >= EVALUATOR_HIGH_CONFIDENCE) return "HIGH" as const;
  if (confidence >= EVALUATOR_MEDIUM_CONFIDENCE) return "MEDIUM" as const;
  return "LOW" as const;
}
