"use server";

import type { PartOfSpeech } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { csvAdapter } from "@/lib/ingestion/csv";
import {
  attachIngestionState,
  commitIngestionCandidates,
  deduplicateCandidates,
} from "@/lib/ingestion/service";
import { revalidateUserDomains } from "@/lib/cache-tags";
import type {
  CandidateWithState,
  IngestionCandidate,
  IngestionSourceType,
} from "@/lib/ingestion/types";

export type ImportPreviewState = {
  status: "idle" | "success" | "error";
  message?: string;
  sourceType?: IngestionSourceType;
  candidates?: CandidateWithState[];
};

function candidateFromAnalysis(
  sourceType: IngestionSourceType,
  analysis: Awaited<ReturnType<typeof analyzeGermanLexeme>>,
): IngestionCandidate {
  const normalized = analysis.lemma.toLocaleLowerCase("de-DE");
  return {
    key: normalized + ":" + analysis.partOfSpeech,
    sourceType,
    lemma: analysis.lemma,
    normalized,
    partOfSpeech: analysis.partOfSpeech,
    article: analysis.article,
    plural: analysis.plural,
    englishMeaning: analysis.englishMeanings.join("; "),
    persianMeaning: analysis.persianMeanings.join("؛ "),
    pattern: analysis.patterns[0]?.pattern ?? null,
    patternExplanation: analysis.patterns[0]?.explanation ?? null,
    example: analysis.examples[0]?.german ?? null,
  };
}

async function enrichMissingCsv(
  userId: string,
  candidates: IngestionCandidate[],
) {
  const enriched: IngestionCandidate[] = [];

  for (const candidate of candidates.slice(0, 50)) {
    if (candidate.englishMeaning && candidate.persianMeaning) {
      enriched.push(candidate);
      continue;
    }

    const analysis = await analyzeGermanLexeme(candidate.lemma, userId);
    enriched.push({
      ...candidate,
      partOfSpeech:
        candidate.partOfSpeech === "OTHER"
          ? analysis.partOfSpeech
          : candidate.partOfSpeech,
      article: candidate.article ?? analysis.article,
      plural: candidate.plural ?? analysis.plural,
      englishMeaning:
        candidate.englishMeaning || analysis.englishMeanings.join("; "),
      persianMeaning:
        candidate.persianMeaning || analysis.persianMeanings.join("؛ "),
      pattern: candidate.pattern ?? analysis.patterns[0]?.pattern ?? null,
      patternExplanation:
        candidate.patternExplanation ??
        analysis.patterns[0]?.explanation ??
        null,
      example: candidate.example ?? analysis.examples[0]?.german ?? null,
    });
  }

  return enriched;
}

export async function previewImport(
  _previous: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const sourceType = String(formData.get("sourceType") ?? "MANUAL") as IngestionSourceType;

  try {
    const user = await getCurrentUser();
    let candidates: IngestionCandidate[] = [];

    if (sourceType === "MANUAL") {
      const value = String(formData.get("manual") ?? "").trim();
      if (!value) return { status: "error", message: "Enter a German word or phrase." };
      const analysis = await analyzeGermanLexeme(value, user.id);
      candidates = [candidateFromAnalysis(sourceType, analysis)];
    } else if (sourceType === "PASTED_TEXT") {
      const text = String(formData.get("text") ?? "").trim();
      if (text.length < 10) {
        return { status: "error", message: "Paste a longer German text to analyze." };
      }

      const analysis = await analyzeReadingText({
        userId: user.id,
        text,
        targetLevel: user.targetLevel,
      });

      candidates = analysis.lexicalUnits.map((item) => {
        const normalized = item.lemma.toLocaleLowerCase("de-DE");
        return {
          key: normalized + ":" + item.partOfSpeech,
          sourceType,
          lemma: item.lemma,
          normalized,
          partOfSpeech: item.partOfSpeech,
          article: item.article,
          plural: item.plural,
          englishMeaning: item.englishMeaning,
          persianMeaning: item.persianMeaning,
          pattern: item.pattern,
          patternExplanation: item.patternExplanation,
          example: item.example,
        };
      });
    } else if (sourceType === "CSV") {
      const file = formData.get("csvFile");
      const pastedCsv = String(formData.get("csvText") ?? "").trim();
      let csvText = pastedCsv;

      if (file instanceof File && file.size > 0) {
        if (file.size > 2_000_000) {
          return { status: "error", message: "CSV files must be under 2 MB." };
        }
        csvText = await file.text();
      }

      if (!csvText) {
        return { status: "error", message: "Choose a CSV file or paste CSV data." };
      }

      candidates = await csvAdapter.parse(csvText);
      candidates = await enrichMissingCsv(user.id, candidates);
    } else {
      return {
        status: "error",
        message: "This import adapter is not enabled yet.",
      };
    }

    const unique = deduplicateCandidates(candidates);
    const withState = await attachIngestionState(db, user.id, unique);

    return {
      status: "success",
      sourceType,
      message: `Found ${withState.length} lexical unit${withState.length === 1 ? "" : "s"}.`,
      candidates: withState,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not analyze this import.",
    };
  }
}

export type ImportCommitState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function confirmImport(
  _previous: ImportCommitState,
  formData: FormData,
): Promise<ImportCommitState> {
  const raw = String(formData.get("payload") ?? "");
  const sourceType = String(formData.get("sourceType") ?? "MANUAL") as IngestionSourceType;

  try {
    const parsed = JSON.parse(raw) as IngestionCandidate[];
    const selected = new Set(formData.getAll("selectedKeys").map(String));
    const candidates = parsed.filter((candidate) => selected.has(candidate.key));

    if (!candidates.length) {
      return { status: "error", message: "Select at least one lexical unit." };
    }

    const user = await getCurrentUser();
    const lexemeIds = await commitIngestionCandidates(db, {
      userId: user.id,
      sourceType,
      sourceRef: "import:" + crypto.randomUUID(),
      candidates,
    });

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "progress"],
      lexemeIds,
    );
    revalidatePath("/vocabulary");
    revalidatePath("/import");

    return {
      status: "success",
      message: `Added ${candidates.length} lexical unit${candidates.length === 1 ? "" : "s"} to your vocabulary.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not commit this import.",
    };
  }
}
