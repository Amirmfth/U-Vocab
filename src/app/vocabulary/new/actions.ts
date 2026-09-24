"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { getCurrentUser } from "@/lib/current-user";

export async function createLexeme(formData: FormData) {
  const input = String(formData.get("word") ?? "").trim();
  if (!input) throw new Error("A German word or phrase is required.");

  const [analysis, user] = await Promise.all([
    analyzeGermanLexeme(input),
    getCurrentUser(),
  ]);

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

  redirect(`/vocabulary/${lexeme.id}`);
}
