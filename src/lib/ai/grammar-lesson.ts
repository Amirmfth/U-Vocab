import type { TargetLanguage } from "@prisma/client";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { targetLanguageConfig } from "@/lib/languages";

const grammarLessonExampleSchema = z.object({
  targetText: z.string().max(500),
  translation: z.string().max(500),
  note: z.string().max(500),
});

const grammarLessonTableSchema = z.object({
  title: z.string().max(160),
  headers: z.array(z.string().max(100)).min(2).max(6),
  rows: z.array(z.array(z.string().max(180)).min(2).max(6)).min(1).max(16),
  note: z.string().max(500).nullable(),
});

const grammarLessonContrastSchema = z.object({
  title: z.string().max(180),
  thisConcept: z.string().max(600),
  otherForm: z.string().max(600),
  difference: z.string().max(800),
});

const grammarLessonMistakeSchema = z.object({
  wrong: z.string().max(500),
  correct: z.string().max(500),
  explanation: z.string().max(700),
});

export const grammarLessonSchema = z.object({
  overview: z.string().min(120).max(2400),
  intuition: z.string().min(80).max(1800),
  whenToUse: z.array(z.string().max(500)).min(2).max(10),
  recognitionCues: z.array(z.string().max(500)).min(2).max(10),
  formation: z.array(z.string().max(700)).min(2).max(12),
  ruleDetails: z.array(z.string().max(900)).min(3).max(14),
  tables: z.array(grammarLessonTableSchema).max(6),
  examples: z.array(grammarLessonExampleSchema).min(6).max(16),
  contrasts: z.array(grammarLessonContrastSchema).max(6),
  commonMistakes: z.array(grammarLessonMistakeSchema).min(2).max(10),
  exceptions: z.array(z.string().max(700)).max(10),
  usageNotes: z.array(z.string().max(700)).max(10),
  speakingWritingTips: z.array(z.string().max(700)).min(2).max(8),
  memoryAids: z.array(z.string().max(500)).min(1).max(6),
  cheatSheet: z.array(z.string().max(500)).min(3).max(12),
});

export type GrammarLessonResult = z.infer<typeof grammarLessonSchema>;

export type GrammarLessonSource = {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  introducedAt: string;
  expectedBy: string | null;
  explanation: string | null;
  rules: unknown;
  exceptions: unknown;
  examples: unknown;
  prerequisites: Array<{ id: string; title: string }>;
  related: Array<{ id: string; title: string; type: string }>;
};

export async function generateGrammarLesson(input: {
  userId?: string;
  userCourseId?: string;
  targetLanguage: TargetLanguage;
  concept: GrammarLessonSource;
  language: "en" | "fa";
}) {
  const target = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("grammar_lesson");
  const usageRecorder = input.userId
    ? createAIUsageRecorder({
        userId: input.userId,
        userCourseId: input.userCourseId,
        operation: "grammar_lesson",
        model: route.model,
        metadata: {
          conceptId: input.concept.id,
          level: input.concept.introducedAt,
          language: input.language,
          targetLanguage: target.code,
        },
      })
    : null;

  try {
    const response = await getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            `You are writing the complete teaching lesson for ONE canonical ${target.promptName} grammar concept in U-Vocab. The supplied concept is authoritative. Expand it pedagogically; do not rename it, change its CEFR placement, invent prerequisites, contradict supplied rules, or create new curriculum concepts. The learner should be able to study this page alone and understand the concept deeply. Write all explanations, table labels, notes, and example translations in ${input.language === "fa" ? "natural Persian (Farsi) using Persian script" : "clear English"}, while keeping ${target.promptName} examples, grammar forms, and wrong/correct sentences in ${target.promptName}. The targetText field must contain the ${target.promptName} example. The example translation field must contain the ${input.language === "fa" ? "Persian" : "English"} translation. Explain intuition as well as mechanics. Use tables only when they materially clarify forms or patterns. Examples must be natural modern ${target.promptName} and progress from simple to harder. Explicitly contrast commonly confused nearby structures when relevant. Include realistic wrong/correct learner mistakes. Exceptions must be genuine and useful; return an empty array if none are important. Avoid filler, motivational prose, Markdown, external links, and textbook-style jargon without explanation. The cheat sheet must be concise enough to scan before speaking or writing.`,
        },
        {
          role: "user",
          content: JSON.stringify({ concept: input.concept }),
        },
      ],
      text: {
        format: zodTextFormat(grammarLessonSchema, "grammar_lesson"),
      },
    });

    if (!response.output_parsed) {
      const error = new Error("OpenAI did not return a valid grammar lesson.");
      await usageRecorder?.failure(error, response);
      throw error;
    }
    await usageRecorder?.success(response);
    return response.output_parsed;
  } catch (error) {
    await usageRecorder?.failure(error);
    throw error;
  }
}
