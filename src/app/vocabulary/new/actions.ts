"use server";

import { revalidatePath } from "next/cache";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { buildReadingExcerpt, rankReadingCandidates } from "@/lib/ai/preprocess";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  attachIngestionState,
  commitIngestionCandidates,
  deduplicateCandidates,
} from "@/lib/ingestion/service";
import type {
  CandidateWithState,
  IngestionCandidate,
} from "@/lib/ingestion/types";

export type VocabularyPreviewState = {
  status: "idle" | "success" | "error";
  message?: string;
  candidates?: CandidateWithState[];
};

export type VocabularyCommitState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function candidateFromLexicalAnalysis(
  analysis: Awaited<ReturnType<typeof analyzeGermanLexeme>>,
): IngestionCandidate {
  const normalized = analysis.lemma.toLocaleLowerCase("de-DE");
  return {
    key: normalized + ":" + analysis.partOfSpeech,
    sourceType: "PASTED_TEXT",
    lemma: analysis.lemma,
    normalized,
    partOfSpeech: analysis.partOfSpeech,
    article: analysis.article,
    plural: analysis.plural,
    cefrLevel: analysis.cefrLevel,
    englishMeaning: analysis.englishMeanings.join("; "),
    persianMeaning: analysis.persianMeanings.join("؛ "),
    pattern: analysis.patterns[0]?.pattern ?? null,
    patternExplanation: analysis.patterns[0]?.explanation ?? null,
    example: analysis.examples[0]?.german ?? null,
  };
}

function isShortLexicalUnit(input: string) {
  return !/[.!?]/.test(input) && input.split(/\s+/).length <= 6;
}

export async function previewVocabularyText(
  _previous: VocabularyPreviewState,
  formData: FormData,
): Promise<VocabularyPreviewState> {
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return { status: "error", message: "Paste a German word, phrase, or text to analyze." };
  }

  try {
    const user = await getCurrentUser();
    let candidates: IngestionCandidate[];

    if (isShortLexicalUnit(text)) {
      const analysis = await analyzeGermanLexeme(text, user.id);
      candidates = [candidateFromLexicalAnalysis(analysis)];
    } else {
      const knownVocabulary = await db.userVocabulary.findMany({
        where: { userId: user.id },
        select: { lexeme: { select: { normalized: true } } },
      });
      const knownLemmas = new Set(
        knownVocabulary.map((item) => item.lexeme.normalized),
      );
      const readingCandidates = rankReadingCandidates(text, knownLemmas, 30);
      const excerpt = buildReadingExcerpt(text, readingCandidates, 12_000);
      const analysis = await analyzeReadingText({
        userId: user.id,
        text: excerpt,
        originalTextChars: text.length,
        candidates: readingCandidates,
        targetLevel: user.targetLevel,
      });

      candidates = analysis.lexicalUnits.map((item) => {
        const normalized = item.lemma.toLocaleLowerCase("de-DE");
        return {
          key: normalized + ":" + item.partOfSpeech,
          sourceType: "PASTED_TEXT",
          lemma: item.lemma,
          normalized,
          partOfSpeech: item.partOfSpeech,
          article: item.article,
          plural: item.plural,
          cefrLevel: item.cefrLevel,
          englishMeaning: item.englishMeaning,
          persianMeaning: item.persianMeaning,
          pattern: item.pattern,
          patternExplanation: item.patternExplanation,
          example: item.example,
        };
      });
    }

    const withState = await attachIngestionState(
      db,
      user.id,
      deduplicateCandidates(candidates),
    );

    return {
      status: "success",
      message: `Found ${withState.length} lexical unit${withState.length === 1 ? "" : "s"}.`,
      candidates: withState,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not analyze this text.",
    };
  }
}

export async function addSelectedVocabulary(
  _previous: VocabularyCommitState,
  formData: FormData,
): Promise<VocabularyCommitState> {
  try {
    const candidates = JSON.parse(String(formData.get("payload") ?? "")) as IngestionCandidate[];
    const selected = new Set(formData.getAll("selectedKeys").map(String));
    const selectedCandidates = candidates.filter((candidate) => selected.has(candidate.key));

    if (!selectedCandidates.length) {
      return { status: "error", message: "Select at least one lexical unit." };
    }

    const user = await getCurrentUser();
    const lexemeIds = await commitIngestionCandidates(db, {
      userId: user.id,
      sourceType: "PASTED_TEXT",
      sourceRef: "pasted-text:" + crypto.randomUUID(),
      candidates: selectedCandidates,
    });

    revalidateUserDomains(user.id, ["home", "vocabulary", "review", "progress"], lexemeIds);
    revalidatePath("/vocabulary");
    revalidatePath("/vocabulary/new");

    return {
      status: "success",
      message: `Added ${selectedCandidates.length} lexical unit${selectedCandidates.length === 1 ? "" : "s"} to your vocabulary.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add the selected vocabulary.",
    };
  }
}
