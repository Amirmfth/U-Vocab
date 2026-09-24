"use server";

import type { PartOfSpeech } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";

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

  if (content.length < 20) {
    return { status: "error", message: "Paste a little more German text." };
  }

  if (content.length > 30_000) {
    return { status: "error", message: "Reading texts are limited to 30,000 characters for now." };
  }

  try {
    const user = await getCurrentUser();
    const analysis = await analyzeReadingText({
      userId: user.id,
      text: content,
      targetLevel: user.targetLevel,
    });

    const document = await db.$transaction(async (tx) => {
      const created = await tx.readingDocument.create({
        data: {
          userId: user.id,
          title: title ?? analysis.title,
          content,
          level: analysis.estimatedLevel,
          sourceType: "PASTED_TEXT",
        },
      });

      const seen = new Set<string>();
      let position = 0;

      for (const unit of analysis.lexicalUnits) {
        const normalized = unit.lemma.toLocaleLowerCase("de-DE").trim();
        const key = normalized + ":" + unit.partOfSpeech;
        if (seen.has(key)) continue;
        seen.add(key);

        let lexeme = await tx.lexeme.findUnique({
          where: {
            language_normalized_partOfSpeech: {
              language: "de",
              normalized,
              partOfSpeech: unit.partOfSpeech as PartOfSpeech,
            },
          },
          include: {
            translations: true,
            patterns: true,
          },
        });

        if (!lexeme) {
          lexeme = await tx.lexeme.create({
            data: {
              lemma: unit.lemma,
              normalized,
              partOfSpeech: unit.partOfSpeech as PartOfSpeech,
              article: unit.article,
              plural: unit.plural,
              translations: {
                create: [
                  { language: "en", text: unit.englishMeaning },
                  { language: "fa", text: unit.persianMeaning },
                ],
              },
              patterns: unit.pattern
                ? {
                    create: [{
                      pattern: unit.pattern,
                      explanation: unit.patternExplanation,
                    }],
                  }
                : undefined,
              examples: unit.example
                ? {
                    create: [{
                      german: unit.example,
                      generatedByAi: true,
                    }],
                  }
                : undefined,
            },
            include: {
              translations: true,
              patterns: true,
            },
          });
        } else {
          const hasEnglish = lexeme.translations.some((item) => item.language === "en");
          const hasPersian = lexeme.translations.some((item) => item.language === "fa");
          const missingPatterns = !lexeme.patterns.length && unit.pattern;

          if (!hasEnglish || !hasPersian || missingPatterns) {
            lexeme = await tx.lexeme.update({
              where: { id: lexeme.id },
              data: {
                translations: {
                  create: [
                    ...(!hasEnglish ? [{ language: "en", text: unit.englishMeaning }] : []),
                    ...(!hasPersian ? [{ language: "fa", text: unit.persianMeaning }] : []),
                  ],
                },
                patterns: missingPatterns
                  ? {
                      create: [{
                        pattern: unit.pattern!,
                        explanation: unit.patternExplanation,
                      }],
                    }
                  : undefined,
              },
              include: {
                translations: true,
                patterns: true,
              },
            });
          }
        }

        await tx.readingItem.create({
          data: {
            readingDocumentId: created.id,
            lexemeId: lexeme.id,
            surfaceText: unit.surfaceText,
            surfaceForms: unit.surfaceForms,
            occurrences: unit.occurrences,
            position: position++,
          },
        });
      }

      return created;
    }, {
      // Reading analysis can contain up to 120 lexical units with dependent writes.
      // Keep the document import atomic without Prisma closing its default 5-second transaction.
      maxWait: 10_000,
      timeout: 60_000,
    },
    );

    revalidatePath("/read");

    return {
      status: "success",
      message: "Text analyzed.",
      documentId: document.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not analyze this text.",
    };
  }
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

    if (!item) return { status: "error", message: "Reading vocabulary item not found." };

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

    revalidatePath("/read/" + documentId);
    revalidatePath("/vocabulary");

    return { status: "success", message: "Added to your vocabulary." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add this lexical unit.",
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
      include: { items: true },
    });

    if (!document) return { status: "error", message: "Reading document not found." };

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

    revalidatePath("/read/" + document.id);

    return {
      status: "success",
      message: `Recorded encounters for ${document.items.length} lexical unit${document.items.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not record reading encounters.",
    };
  }
}
