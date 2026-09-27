export type GrammarEvidenceSourceCode =
  | "PRACTICE"
  | "WRITING"
  | "READING_COMPREHENSION"
  | "CONVERSATION"
  | "MANUAL";

export type GrammarEvidenceOutcomeCode =
  | "SUCCESS"
  | "ERROR"
  | "OPPORTUNITY"
  | "ENCOUNTER";

export type GrammarEvidenceDimensionCode =
  | "UNDERSTANDING"
  | "CONTROLLED_PRODUCTION"
  | "FREE_PRODUCTION";

export type GrammarStatusCode =
  | "UNASSESSED"
  | "ASSUMED"
  | "LEARNING"
  | "STRONG"
  | "NEEDS_ATTENTION";

export type GrammarEvidencePolicyInput = {
  outcome: GrammarEvidenceOutcomeCode;
  source: GrammarEvidenceSourceCode;
  dimension: GrammarEvidenceDimensionCode;
  strength?: number;
  confidence?: number;
};

export type StoredGrammarEvidence = {
  outcome: GrammarEvidenceOutcomeCode;
  dimension: GrammarEvidenceDimensionCode;
  effectiveWeight: number;
  accepted: boolean;
};

export type GrammarProfileCalculation = {
  status: GrammarStatusCode;
  understanding: number;
  controlledProduction: number;
  freeProduction: number;
  evidenceCount: number;
  successWeight: number;
  errorWeight: number;
};

const SOURCE_WEIGHT: Record<GrammarEvidenceSourceCode, number> = {
  PRACTICE: 0.65,
  WRITING: 1,
  READING_COMPREHENSION: 0.45,
  CONVERSATION: 0.85,
  MANUAL: 1,
};

const DIMENSION_WEIGHT: Record<GrammarEvidenceDimensionCode, number> = {
  UNDERSTANDING: 0.65,
  CONTROLLED_PRODUCTION: 0.85,
  FREE_PRODUCTION: 1,
};

export const MIN_GRAMMAR_EVIDENCE_CONFIDENCE = 0.55;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function evaluateGrammarEvidencePolicy(input: GrammarEvidencePolicyInput) {
  const confidence = clamp(input.confidence ?? 1);
  const strength = clamp(input.strength ?? 1, 0, 2);
  const masterySignal =
    input.outcome === "SUCCESS" || input.outcome === "ERROR";
  const accepted = masterySignal && confidence >= MIN_GRAMMAR_EVIDENCE_CONFIDENCE;
  const effectiveWeight = accepted
    ? strength *
      confidence *
      SOURCE_WEIGHT[input.source] *
      DIMENSION_WEIGHT[input.dimension]
    : 0;

  return { confidence, strength, accepted, effectiveWeight };
}

function dimensionScore(
  evidence: StoredGrammarEvidence[],
  dimension: GrammarEvidenceDimensionCode,
) {
  const relevant = evidence.filter(
    (item) =>
      item.accepted &&
      item.dimension === dimension &&
      (item.outcome === "SUCCESS" || item.outcome === "ERROR"),
  );
  const success = relevant
    .filter((item) => item.outcome === "SUCCESS")
    .reduce((sum, item) => sum + item.effectiveWeight, 0);
  const error = relevant
    .filter((item) => item.outcome === "ERROR")
    .reduce((sum, item) => sum + item.effectiveWeight, 0);
  const total = success + error;
  return total > 0 ? success / total : 0;
}

export function calculateGrammarProfile(
  previousStatus: GrammarStatusCode,
  evidence: StoredGrammarEvidence[],
): GrammarProfileCalculation {
  const masteryEvidence = evidence.filter(
    (item) =>
      item.accepted &&
      (item.outcome === "SUCCESS" || item.outcome === "ERROR"),
  );
  const successes = masteryEvidence.filter((item) => item.outcome === "SUCCESS");
  const errors = masteryEvidence.filter((item) => item.outcome === "ERROR");
  const successWeight = successes.reduce(
    (sum, item) => sum + item.effectiveWeight,
    0,
  );
  const errorWeight = errors.reduce(
    (sum, item) => sum + item.effectiveWeight,
    0,
  );

  let status: GrammarStatusCode = previousStatus;

  const recurringError =
    errors.length >= 2 &&
    errorWeight >= 1.2 &&
    errorWeight > successWeight * 1.15;
  const demonstratedStrength =
    successes.length >= 3 &&
    successWeight >= 1.6 &&
    errorWeight <= successWeight * 0.3;

  if (recurringError) {
    status = "NEEDS_ATTENTION";
  } else if (demonstratedStrength) {
    status = "STRONG";
  } else if (masteryEvidence.length > 0) {
    // Hysteresis: one weak/noisy result must not destroy an established strong
    // concept. It takes the recurring-error threshold above to downgrade it.
    status = previousStatus === "STRONG" ? "STRONG" : "LEARNING";
  }

  return {
    status,
    understanding: dimensionScore(evidence, "UNDERSTANDING"),
    controlledProduction: dimensionScore(evidence, "CONTROLLED_PRODUCTION"),
    freeProduction: dimensionScore(evidence, "FREE_PRODUCTION"),
    evidenceCount: masteryEvidence.length,
    successWeight,
    errorWeight,
  };
}

export function grammarStatusLabel(status: GrammarStatusCode) {
  switch (status) {
    case "UNASSESSED":
      return "Not assessed";
    case "ASSUMED":
      return "Assumed";
    case "LEARNING":
      return "Learning";
    case "STRONG":
      return "Strong";
    case "NEEDS_ATTENTION":
      return "Needs attention";
  }
}
