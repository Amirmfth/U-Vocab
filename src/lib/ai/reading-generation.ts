import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

const readingQuestionSchema = z.object({
  type: z.enum(["COMPREHENSION", "VOCABULARY", "GRAMMAR"]),
  question: z.string().max(500),
  options: z.array(z.string().max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(500),
  grammarConceptId: z.string().nullable(),
});

export const generatedReadingSchema = z.object({
  title: z.string().max(180),
  content: z.string().min(200).max(12000),
  englishSummary: z.string().max(1000),
  persianSummary: z.string().max(1200),
  usedTargets: z.array(z.string()).max(20),
  grammarCoverage: z.array(
    z.object({
      grammarConceptId: z.string(),
      excerpt: z.string().max(500),
      explanation: z.string().max(500),
      intentional: z.boolean(),
    }),
  ).max(12),
  questions: z.array(readingQuestionSchema).min(4).max(8),
});

export type GeneratedReading = z.infer<typeof generatedReadingSchema>;

export async function generateReading(input: {
  userId: string;
  level: string;
  length: "SHORT" | "MEDIUM" | "LONG";
  minimumTargets: number;
  topic?: string | null;
  selectedTargets: Array<{ lemma: string; pattern?: string | null }>;
  candidateTargets: Array<{ lemma: string; pattern?: string | null }>;
  grammarConcepts: Array<{
    id: string;
    title: string;
    shortDescription: string;
    status: string;
  }>;
}) {
  const route = aiRoute("story_generation");
  const perf = startOperation("ai.reading_generation", {
    model: route.model,
    level: input.level,
    grammarTargets: input.grammarConcepts.length,
  });
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "reading_generation",
    model: route.model,
    metadata: {
      level: input.level,
      length: input.length,
      selectedTargetCount: input.selectedTargets.length,
      candidateTargetCount: input.candidateTargets.length,
      grammarTargetCount: input.grammarConcepts.length,
    },
  });

  try {
    const response = await perf.span("provider", () =>
      getOpenAI().responses.parse({
        model: route.model,
        max_output_tokens: route.maxOutputTokens,
        input: [
          {
            role: "system",
            content:
              "Generate natural, coherent German reading material whose main purpose is reading comprehension. Match the requested CEFR level. Include at least minimumTargets DISTINCT vocabulary lemmas from selectedTargets and candidateTargets as exact standalone words or phrases in the content, prioritizing selectedTargets. Plan the story around them so the prose remains idiomatic. Return usedTargets only for target lemmas that genuinely appear. grammarConcepts is the ONLY grammar-ID allowlist; grammarCoverage and GRAMMAR questions may reference only those IDs. Coverage must quote an excerpt that actually demonstrates the concept. Grammar coverage may be lower when naturalness requires it. Include mostly comprehension questions, with at most two vocabulary/grammar questions. Questions must be answerable from the text and have exactly four options. A GRAMMAR question should test understanding of the structure in context, not terminology trivia. Do not reveal question answers in annotations or explanations embedded in the reading text.",
          },
          {
            role: "user",
            content: JSON.stringify({ ...input, userId: undefined }),
          },
        ],
        text: {
          format: zodTextFormat(generatedReadingSchema, "generated_reading"),
        },
      }),
    );

    if (!response.output_parsed) {
      const error = new Error("OpenAI did not return valid reading material.");
      await usageRecorder.failure(error, response);
      throw error;
    }

    const allowedGrammar = new Set(input.grammarConcepts.map((item) => item.id));
    const grammarCoverage = response.output_parsed.grammarCoverage.filter(
      (item) => allowedGrammar.has(item.grammarConceptId),
    );
    const questions = response.output_parsed.questions.map((question) => ({
      ...question,
      grammarConceptId:
        question.grammarConceptId &&
        allowedGrammar.has(question.grammarConceptId)
          ? question.grammarConceptId
          : null,
      type:
        question.type === "GRAMMAR" &&
        (!question.grammarConceptId ||
          !allowedGrammar.has(question.grammarConceptId))
          ? ("COMPREHENSION" as const)
          : question.type,
    }));

    await usageRecorder.success(response);
    perf.success({ requestId: response.id });

    return {
      ...response.output_parsed,
      grammarCoverage,
      questions,
    };
  } catch (error) {
    perf.fail(error);
    await usageRecorder.failure(error);
    throw error;
  }
}
