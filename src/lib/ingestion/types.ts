import type { PartOfSpeech } from "@prisma/client";

export type IngestionSourceType =
  | "MANUAL"
  | "PASTED_TEXT"
  | "CSV"
  | "URL"
  | "ANKI"
  | "BROWSER_EXTENSION"
  | "TOPIC_PACK";

export type IngestionCandidate = {
  key: string;
  sourceType: IngestionSourceType;
  sourceRef?: string | null;
  surface?: string | null;
  lemma: string;
  normalized: string;
  partOfSpeech: PartOfSpeech;
  article?: string | null;
  plural?: string | null;
  cefrLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  englishMeaning: string;
  persianMeaning: string;
  pattern?: string | null;
  patternExplanation?: string | null;
  example?: string | null;
  resolutionSource?: "canonical_hit" | "alias_hit" | "ai_generation" | "ambiguous";
  provenance?: {
    source: "CURATED" | "IMPORTED" | "AI_GENERATED" | "USER_CONFIRMED";
    provider?: string | null;
    model?: string | null;
    promptVersion?: string | null;
    contentVersion?: string | null;
    confidence?: number | null;
    reviewState?: "UNREVIEWED" | "ACCEPTED" | "FLAGGED" | "CURATED";
  };
};

export type CandidateWithState = IngestionCandidate & {
  existingLexemeId: string | null;
  userVocabularyId: string | null;
  state: string | null;
};

export interface IngestionAdapter<TInput> {
  sourceType: IngestionSourceType;
  parse(input: TInput): Promise<IngestionCandidate[]>;
}
