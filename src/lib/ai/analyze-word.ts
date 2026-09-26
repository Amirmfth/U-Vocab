import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "./client";
import { aiRoute } from "./routing";
import { lexicalAnalysisSchema } from "./schemas";
import { createAIUsageRecorder } from "./usage-recorder";
import { startOperation } from "@/lib/performance";

export async function analyzeGermanLexeme(input: string, userId: string) {
  const route = aiRoute("lexical_analysis");
  const perf = startOperation("ai.lexical_analysis", { model: route.model, inputChars: input.length });
  const usageRecorder = createAIUsageRecorder({
    userId,
    operation: "lexical_analysis",
    model: route.model,
    metadata: { inputChars: input.length },
  });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: route.model,
      max_output_tokens: route.maxOutputTokens,
      input: [
        {
          role: "system",
          content:
            "You analyze German lexical units for U-Vocab. Prefer complete usable lexical patterns, collocations, cases, and prepositions over isolated translations. Return natural English and Persian meanings. Assign the lexical unit's usual CEFR level (A1 through C2).",
        },
        { role: "user", content: input },
      ],
      text: { format: zodTextFormat(lexicalAnalysisSchema, "lexical_analysis") },
    }));

    if (!response.output_parsed) {
      const parseError = new Error("OpenAI did not return a valid lexical analysis.");
      await usageRecorder.failure(parseError, response);
      throw parseError;
    }

    await usageRecorder.success(response);

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid lexical analysis.")) {
      await usageRecorder.failure(error);
    }
    throw error;
  }
}
