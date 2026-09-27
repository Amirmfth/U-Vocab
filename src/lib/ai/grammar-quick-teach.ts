import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";

export async function generateGrammarQuickTeach(input: {
  userId: string;
  title: string;
  level: string;
  targetLevel: string;
  language: "English" | "Persian";
  canonicalSummary: string;
  mainLessonSummary: string;
  rules: string[];
  recentMistakes: string[];
  personalVocabulary: string[];
  previousAngle?: string | null;
}) {
  const route = aiRoute("grammar_quick_teach");
  const usageRecorder = createAIUsageRecorder({
    userId: input.userId,
    operation: "grammar_quick_teach",
    model: route.model,
    metadata: {
      level: input.level,
      targetLevel: input.targetLevel,
      language: input.language,
    },
  });

  const angles = [
    "example-first",
    "analogy-first",
    "contrast-first",
    "mistake-first",
    "step-by-step rule-first",
    "speaking-and-writing-first",
  ];
  const availableAngles = input.previousAngle
    ? angles.filter((angle) => angle !== input.previousAngle)
    : angles;

  try {
    const response = await getOpenAI().responses.create({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            `You are a German grammar tutor. Explain the supplied canonical grammar concept in ${input.language} from a DIFFERENT pedagogical angle than the main stored lesson. Choose one angle from: ${availableAngles.join(", ")}. Start the response with a single line exactly in the form "Angle: <chosen angle>". Then give a fresh, self-contained explanation of roughly 500-800 words (or equivalent Persian length). The concept data and supplied rules are authoritative: never contradict them, never invent a new grammar concept, and do not change CEFR placement. Prefer concrete German examples. Use the learner's personal vocabulary naturally when useful. If recent mistakes are supplied, address the misunderstanding without exposing private metadata. Include at least one contrast, one common mistake, and a tiny final checklist. Markdown is allowed and should be readable in a bottom sheet.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            learnerLevel: input.level,
            targetLevel: input.targetLevel,
            canonicalSummary: input.canonicalSummary,
            mainLessonSummary: input.mainLessonSummary,
            rules: input.rules.slice(0, 10),
            recentMistakes: input.recentMistakes.slice(0, 5),
            personalVocabulary: input.personalVocabulary.slice(0, 10),
          }),
        },
      ],
    });

    const lesson = response.output_text.trim();
    if (!lesson) {
      const error = new Error("The tutor returned an empty grammar explanation.");
      await usageRecorder.failure(error, response);
      throw error;
    }
    await usageRecorder.success(response);
    return lesson;
  } catch (error) {
    await usageRecorder.failure(error);
    throw error;
  }
}
