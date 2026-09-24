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
  lemma: string;
  normalized: string;
  partOfSpeech: PartOfSpeech;
  article?: string | null;
  plural?: string | null;
  englishMeaning: string;
  persianMeaning: string;
  pattern?: string | null;
  patternExplanation?: string | null;
  example?: string | null;
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
