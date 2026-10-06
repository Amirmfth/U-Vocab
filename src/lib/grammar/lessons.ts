import type { PrismaClient, TargetLanguage } from "@prisma/client";
import {
  generateGrammarLesson,
  type GrammarLessonSource,
} from "@/lib/ai/grammar-lesson";
import { targetLanguageFromCode } from "@/lib/languages";

export async function getGrammarLessonSource(
  db: PrismaClient,
  grammarConceptId: string,
): Promise<(GrammarLessonSource & { contentVersion: number; slug: string; targetLanguage: TargetLanguage }) | null> {
  const concept = await db.grammarConcept.findFirst({
    where: { id: grammarConceptId, active: true },
    include: {
      prerequisites: {
        include: {
          prerequisite: { select: { id: true, title: true } },
        },
      },
      outgoingRelations: {
        include: {
          target: { select: { id: true, title: true } },
        },
        take: 12,
      },
    },
  });
  if (!concept) return null;
  const targetLanguage = targetLanguageFromCode(concept.language);
  if (!targetLanguage) return null;

  return {
    targetLanguage,
    id: concept.id,
    slug: concept.slug,
    title: concept.title,
    shortDescription: concept.shortDescription,
    category: concept.category,
    introducedAt: concept.introducedAt,
    expectedBy: concept.expectedBy,
    explanation: concept.explanation,
    rules: concept.rules,
    exceptions: concept.exceptions,
    examples: concept.examples,
    contentVersion: concept.contentVersion,
    prerequisites: concept.prerequisites.map(({ prerequisite }) => prerequisite),
    related: concept.outgoingRelations.map((relation) => ({
      id: relation.target.id,
      title: relation.target.title,
      type: relation.type,
    })),
  };
}

export async function generateAndPersistGrammarLesson(
  db: PrismaClient,
  input: {
    grammarConceptId: string;
    language: "en" | "fa";
    userId?: string;
    userCourseId?: string;
  },
) {
  const source = await getGrammarLessonSource(db, input.grammarConceptId);
  if (!source) throw new Error("Grammar concept not found.");

  const generated = await generateGrammarLesson({
    userId: input.userId,
    userCourseId: input.userCourseId,
    targetLanguage: source.targetLanguage,
    concept: source,
    language: input.language,
  });

  return db.grammarLesson.upsert({
    where: { grammarConceptId_language: { grammarConceptId: source.id, language: input.language } },
    create: {
      grammarConceptId: source.id,
      language: input.language,
      sourceContentVersion: source.contentVersion,
      overview: generated.overview,
      intuition: generated.intuition,
      whenToUse: generated.whenToUse,
      recognitionCues: generated.recognitionCues,
      formation: generated.formation,
      ruleDetails: generated.ruleDetails,
      tables: generated.tables,
      examples: generated.examples,
      contrasts: generated.contrasts,
      commonMistakes: generated.commonMistakes,
      exceptions: generated.exceptions,
      usageNotes: generated.usageNotes,
      speakingWritingTips: generated.speakingWritingTips,
      memoryAids: generated.memoryAids,
      cheatSheet: generated.cheatSheet,
    },
    update: {
      version: { increment: 1 },
      promptVersion: "v1",
      generatedByAi: true,
      sourceContentVersion: source.contentVersion,
      generatedAt: new Date(),
      overview: generated.overview,
      intuition: generated.intuition,
      whenToUse: generated.whenToUse,
      recognitionCues: generated.recognitionCues,
      formation: generated.formation,
      ruleDetails: generated.ruleDetails,
      tables: generated.tables,
      examples: generated.examples,
      contrasts: generated.contrasts,
      commonMistakes: generated.commonMistakes,
      exceptions: generated.exceptions,
      usageNotes: generated.usageNotes,
      speakingWritingTips: generated.speakingWritingTips,
      memoryAids: generated.memoryAids,
      cheatSheet: generated.cheatSheet,
    },
  });
}

export function grammarLessonNeedsRefresh(input: {
  lesson: { sourceContentVersion: number } | null;
  contentVersion: number;
}) {
  return !input.lesson || input.lesson.sourceContentVersion < input.contentVersion;
}
