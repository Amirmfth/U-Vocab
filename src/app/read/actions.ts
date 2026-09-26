"use server";

import type { PartOfSpeech } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";
import { instrumentOperation } from "@/lib/performance";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { deduplicateLexicalItems } from "@/lib/lexical-batch";
import { buildReadingExcerpt, rankReadingCandidates } from "@/lib/ai/preprocess";

export type ReadingCreateState = {
  status: "idle" | "success" | "error";
  message?: string;
  documentId?: string;
};

export async function createReadingDocument(
  _previous: ReadingCreateState,
  formData: FormData,
): Promise<ReadingCreateState> {
  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;

  return instrumentOperation(
    "reading.create",
    {
      contentChars: content.length,
      hasTitle: Boolean(title),
    },
    async (perf) => {
      if (content.length < 20) {
        return {
          status: "error",
          message: "Paste a little more German text.",
        };
      }

      if (content.length > 30_000) {
        return {
          status: "error",
          message: "Reading texts are limited to 30,000 characters for now.",
        };
      }

      try {
        const user = await perf.span("auth", () => getCurrentUser());
        const known = await perf.span("dbRead", () =>
          db.userVocabulary.findMany({
            where: { userId: user.id },
            select: { lexeme: { select: { normalized: true } } },
          }),
        );
        const knownLemmas = new Set(
          known.map((item) => item.lexeme.normalized),
        );
        const candidates = rankReadingCandidates(content, knownLemmas, 30);
        const excerpt = buildReadingExcerpt(content, candidates, 12_000);

        const analysis = await perf.span("ai", () =>
          analyzeReadingText({
            userId: user.id,
            text: excerpt,
            originalTextChars: content.length,
            candidates,
            targetLevel: user.targetLevel,
          }),
        );

        const lexicalUnits = deduplicateLexicalItems(
          analysis.lexicalUnits,
        ).map((unit, position) => ({
            ...unit,
            normalized: unit.lemma.toLocaleLowerCase("de-DE").trim(),
            position,
          }));

        const lookup = lexicalUnits.map((unit) => ({
          language: "de",
          normalized: unit.normalized,
          partOfSpeech: unit.partOfSpeech as PartOfSpeech,
        }));

        const existing = lookup.length
          ? await perf.span("dbRead", () =>
              db.lexeme.findMany({
                where: { OR: lookup },
                select: {
                  id: true,
                  normalized: true,
                  partOfSpeech: true,
                },
              }),
            )
          : [];

        const existingKeys = new Set(
          existing.map(
            (lexeme) => lexeme.normalized + ":" + lexeme.partOfSpeech,
          ),
        );
        const missingUnits = lexicalUnits.filter(
          (unit) =>
            !existingKeys.has(unit.normalized + ":" + unit.partOfSpeech),
        );
        const missingKeys = new Set(
          missingUnits.map(
            (unit) => unit.normalized + ":" + unit.partOfSpeech,
          ),
        );

        const document = await perf.span("dbWrite", () =>
          db.$transaction(
            async (tx) => {
              if (missingUnits.length) {
                await tx.lexeme.createMany({
                  data: missingUnits.map((unit) => ({
                    lemma: unit.lemma,
                    normalized: unit.normalized,
                    language: "de",
                    partOfSpeech: unit.partOfSpeech as PartOfSpeech,
                    article: unit.article,
                    plural: unit.plural,
                    cefrLevel: unit.cefrLevel,
                  })),
                  skipDuplicates: true,
                });
              }

              const lexemes = lookup.length
                ? await tx.lexeme.findMany({
                    where: { OR: lookup },
                    select: {
                      id: true,
                      normalized: true,
                      partOfSpeech: true,
                      translations: { select: { language: true } },
                      patterns: { select: { id: true } },
                    },
                  })
                : [];

              const lexemeByKey = new Map(
                lexemes.map((lexeme) => [
                  lexeme.normalized + ":" + lexeme.partOfSpeech,
                  lexeme,
                ]),
              );

              const translations = [];
              const patterns = [];
              const examples = [];
              const readingItems = [];

              for (const unit of lexicalUnits) {
                const key = unit.normalized + ":" + unit.partOfSpeech;
                const lexeme = lexemeByKey.get(key);
                if (!lexeme) continue;

                const languages = new Set(
                  lexeme.translations.map((translation) => translation.language),
                );
                if (!languages.has("en")) {
                  translations.push({
                    lexemeId: lexeme.id,
                    language: "en",
                    text: unit.englishMeaning,
                  });
                }
                if (!languages.has("fa")) {
                  translations.push({
                    lexemeId: lexeme.id,
                    language: "fa",
                    text: unit.persianMeaning,
                  });
                }
                if (!lexeme.patterns.length && unit.pattern) {
                  patterns.push({
                    lexemeId: lexeme.id,
                    pattern: unit.pattern,
                    explanation: unit.patternExplanation,
                  });
                }
                if (missingKeys.has(key) && unit.example) {
                  examples.push({
                    lexemeId: lexeme.id,
                    german: unit.example,
                    generatedByAi: true,
                  });
                }

                readingItems.push({
                  lexemeId: lexeme.id,
                  surfaceText: unit.surfaceText,
                  surfaceForms: unit.surfaceForms,
                  occurrences: unit.occurrences,
                  position: unit.position,
                });
              }

              if (translations.length) {
                await tx.translation.createMany({ data: translations });
              }
              if (patterns.length) {
                await tx.lexicalPattern.createMany({ data: patterns });
              }
              if (examples.length) {
                await tx.example.createMany({ data: examples });
              }

              const created = await tx.readingDocument.create({
                data: {
                  userId: user.id,
                  title: title ?? analysis.title,
                  content,
                  level: analysis.estimatedLevel,
                  sourceType: "PASTED_TEXT",
                },
              });

              if (readingItems.length) {
                await tx.readingItem.createMany({
                  data: readingItems.map((item) => ({
                    readingDocumentId: created.id,
                    ...item,
                  })),
                });
              }

              return created;
            },
            {
              maxWait: 10_000,
              timeout: 20_000,
            },
          ),
        );

        await perf.span("revalidation", async () => {
          revalidateUserDomains(user.id, ["reading"]);
          revalidatePath("/read");
        });

        return {
          status: "success",
          message: "Text analyzed.",
          documentId: document.id,
        };
      } catch (error) {
        perf.fail(error, { stage: "reading.create" });
        return {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not analyze this text.",
        };
      }
    },
  );
}

export type ReadingMutationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addReadingLexeme(
  _previous: ReadingMutationState,
  formData: FormData,
): Promise<ReadingMutationState> {
  const lexemeId = String(formData.get("lexemeId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");

  try {
    const user = await getCurrentUser();
    const item = await db.readingItem.findFirst({
      where: {
        readingDocumentId: documentId,
        lexemeId,
        readingDocument: { userId: user.id },
      },
    });

    if (!item) {
      return {
        status: "error",
        message: "Reading vocabulary item not found.",
      };
    }

    await db.userVocabulary.upsert({
      where: {
        userId_lexemeId: {
          userId: user.id,
          lexemeId,
        },
      },
      create: {
        userId: user.id,
        lexemeId,
        nextReviewAt: new Date(),
      },
      update: {},
    });

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "reading"],
      [lexemeId],
    );
    revalidatePath("/read/" + documentId);
    revalidatePath("/vocabulary");

    return { status: "success", message: "Added to your vocabulary." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not add this lexical unit.",
    };
  }
}

export async function recordReadingEncounters(
  _previous: ReadingMutationState,
  formData: FormData,
): Promise<ReadingMutationState> {
  const documentId = String(formData.get("documentId") ?? "");

  try {
    const user = await getCurrentUser();
    const document = await db.readingDocument.findFirst({
      where: { id: documentId, userId: user.id },
      select: {
        id: true,
        content: true,
        items: { select: { lexemeId: true } },
      },
    });

    if (!document) {
      return {
        status: "error",
        message: "Reading document not found.",
      };
    }

    await db.encounter.createMany({
      data: document.items.map((item) => ({
        userId: user.id,
        lexemeId: item.lexemeId,
        source: "reading",
        sourceRef: document.id,
        context: document.content.slice(0, 1000),
      })),
      skipDuplicates: true,
    });

    revalidateUserDomains(
      user.id,
      ["vocabulary", "reading"],
      document.items.map((item) => item.lexemeId),
    );
    revalidatePath("/read/" + document.id);

    return {
      status: "success",
      message: `Recorded encounters for ${document.items.length} lexical unit${document.items.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not record reading encounters.",
    };
  }
}
