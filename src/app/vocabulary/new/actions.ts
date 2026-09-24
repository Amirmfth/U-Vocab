"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { getCurrentUser } from "@/lib/current-user";
import { commitIngestionCandidates } from "@/lib/ingestion/service";

export type CreateLexemeState = {
  status: "idle" | "error";
  message?: string;
};

export async function createLexeme(
  _previous: CreateLexemeState,
  formData: FormData,
): Promise<CreateLexemeState> {
  const input = String(formData.get("word") ?? "").trim();

  if (!input) {
    return { status: "error", message: "Enter a German word or lexical phrase." };
  }

  let lexemeId: string;

  try {
    const user = await getCurrentUser();
    const analysis = await analyzeGermanLexeme(input, user.id);
    const normalized = analysis.lemma.toLocaleLowerCase("de-DE");

    const ids = await commitIngestionCandidates(db, {
      userId: user.id,
      sourceType: "MANUAL",
      sourceRef: "manual:" + crypto.randomUUID(),
      candidates: [{
        key: normalized + ":" + analysis.partOfSpeech,
        sourceType: "MANUAL",
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
      }],
    });

    if (!ids[0]) {
      return { status: "error", message: "Could not add this lexical unit." };
    }

    lexemeId = ids[0];
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not analyze this lexical unit. Try again.",
    };
  }

  redirect(`/vocabulary/${lexemeId}`);
}
