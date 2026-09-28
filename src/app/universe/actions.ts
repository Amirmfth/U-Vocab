"use server";

const disabledMessage = "Word Universe is disabled.";

export async function expandUniverseNode(_input: {
  lexemeId: string;
  includeSemantic?: boolean;
}): Promise<never> {
  throw new Error(disabledMessage);
}

export async function learnUniverseNode(_lexemeId: string): Promise<never> {
  throw new Error(disabledMessage);
}

export async function suggestUniverseExpansion(_lexemeId: string): Promise<never> {
  throw new Error(disabledMessage);
}

export async function addUniverseSuggestion(_input: {
  sourceId: string;
  lemma: string;
  partOfSpeech: string;
  article: string | null;
  plural: string | null;
  englishMeaning: string;
  persianMeaning: string;
  relationType: string;
}): Promise<never> {
  throw new Error(disabledMessage);
}
