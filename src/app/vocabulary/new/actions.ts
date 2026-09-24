"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { getCurrentUser } from "@/lib/current-user";

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

    const existing = await db.lexeme.findUnique({
      where: {
        language_normalized_partOfSpeech: {
          language: "de",
          normalized,
          partOfSpeech: analysis.partOfSpeech,
        },
      },
    });

    const lexeme =
      existing ??
      (await db.lexeme.create({
        data: {
          lemma: analysis.lemma,
          normalized,
          partOfSpeech: analysis.partOfSpeech,
          article: analysis.article,
          gender: analysis.gender,
          plural: analysis.plural,
          translations: {
            create: [
              ...analysis.englishMeanings.map((text) => ({ language: "en", text })),
              ...analysis.persianMeanings.map((text) => ({ language: "fa", text })),
            ],
          },
          patterns: { create: analysis.patterns },
          examples: {
            create: analysis.examples.map((example) => ({
              ...example,
              generatedByAi: true,
            })),
          },
        },
      }));

    await db.userVocabulary.upsert({
      where: { userId_lexemeId: { userId: user.id, lexemeId: lexeme.id } },
      create: { userId: user.id, lexemeId: lexeme.id, nextReviewAt: new Date() },
      update: {},
    });

    lexemeId = lexeme.id;
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
