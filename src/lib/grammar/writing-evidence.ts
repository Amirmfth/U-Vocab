import type {
  GrammarCategory,
  GrammarEvidenceOutcome,
  MistakeType,
} from "@prisma/client";
import type { WritingEvaluation } from "@/lib/ai/writing-evaluator";

export const MIN_WRITING_GRAMMAR_CONFIDENCE = 0.72;

export type ValidWritingGrammarObservation =
  WritingEvaluation["grammarObservations"][number];

const CATEGORY_MISTAKE: Partial<Record<GrammarCategory, MistakeType>> = {
  ARTICLES: "ARTICLE",
  CASES: "CASE",
  PREPOSITIONS: "PREPOSITION",
  ADJECTIVES: "ADJECTIVE_ENDING",
  WORD_ORDER: "WORD_ORDER",
  TENSES: "TENSE",
  VERBS: "CONJUGATION",
  PRONOUNS: "PRONOUN",
  RELATIVE_CLAUSES: "RELATIVE_CLAUSE",
  PASSIVE: "PASSIVE",
  SUBJUNCTIVE: "SUBJUNCTIVE",
};

export function grammarMistakeTypeForCategory(
  category: GrammarCategory,
): MistakeType {
  return CATEGORY_MISTAKE[category] ?? "OTHER";
}

export function acceptedWritingGrammarObservations(
  observations: ValidWritingGrammarObservation[],
  allowedConceptIds: ReadonlySet<string>,
) {
  return observations.filter(
    (observation) =>
      allowedConceptIds.has(observation.grammarConceptId) &&
      observation.confidence >= MIN_WRITING_GRAMMAR_CONFIDENCE,
  );
}

export function writingEvidenceOutcome(
  signal: ValidWritingGrammarObservation["signal"],
): GrammarEvidenceOutcome {
  return signal;
}

export function parentErrorConceptIds(
  evaluation: Pick<WritingEvaluation, "grammarObservations"> | null | undefined,
) {
  return new Set(
    (evaluation?.grammarObservations ?? [])
      .filter(
        (observation) =>
          observation.signal === "ERROR" &&
          observation.confidence >= MIN_WRITING_GRAMMAR_CONFIDENCE,
      )
      .map((observation) => observation.grammarConceptId),
  );
}

export function writingObservationStrength(
  observation: ValidWritingGrammarObservation,
  isRewriteCorrection: boolean,
) {
  if (observation.signal === "OPPORTUNITY") return 0.35;
  if (observation.signal === "SUCCESS") return isRewriteCorrection ? 1.15 : 0.9;
  return 1;
}
