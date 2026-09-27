import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";

export async function generateQuickTeach(input: {
  userId: string;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  level: string;
  meaning: string;
  language: "English" | "Persian";
  patterns: string[];
}) {
  const route = aiRoute("quick_teach");
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "quick_teach",
    model: route.model,
    metadata: { level: input.level, language: input.language },
  });

  try {
    const response = await getOpenAI().responses.create({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content: `You are a practical German tutor. Teach the given word in ${input.language} at the learner's CEFR level. Aim for a useful 200 to 300 word lesson (or equivalent length in Persian). Explain when to use it, give two natural German examples with translations, note one common mistake or nuance. Keep the explanation clear and avoid filler.`,
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
