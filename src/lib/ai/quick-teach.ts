import type { TargetLanguage } from "@prisma/client";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";
import { targetLanguageConfig } from "@/lib/languages";

export async function generateQuickTeach(input: {
  userId: string;
  userCourseId: string;
  targetLanguage: TargetLanguage;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  level: string;
  meaning: string;
  language: "English" | "Persian";
  patterns: string[];
}) {
  const target = targetLanguageConfig(input.targetLanguage);
  const route = aiRoute("quick_teach");
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: "quick_teach",
    model: route.model,
    metadata: {
      level: input.level,
      language: input.language,
      targetLanguage: target.code,
    },
  });

  try {
    const response = await getOpenAI().responses.create({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content: `You are a practical ${target.promptName} tutor. Teach the given lexical unit in ${input.language} at the learner's CEFR level. Aim for a useful 200 to 300 word lesson (or equivalent length in Persian). Explain when to use it, give two natural ${target.promptName} examples with translations, note one common mistake or nuance, and preserve language-specific spelling and morphology. Keep the explanation clear and avoid filler.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            word: input.lemma,
            article: input.article,
            partOfSpeech: input.partOfSpeech,
            level: input.level,
            meaning: input.meaning,
            patterns: input.patterns.slice(0, 2),
          }),
        },
      ],
    });
    const lesson = response.output_text.trim();
    if (!lesson) {
      const error = new Error("The tutor returned an empty lesson.");
      await usageRecorder.failure(error, response);
      throw error;
    }
    await usageRecorder.success(response);
    return lesson;
  } catch (error) {
    if (
      !(
        error instanceof Error &&
        error.message === "The tutor returned an empty lesson."
      )
    ) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
