import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { lexicalAnalysisSchema } from "./schemas";
import { recordAIUsage } from "./usage";
import { startOperation } from "@/lib/performance";

export async function analyzeGermanLexeme(input: string, userId: string) {
  const perf = startOperation("ai.lexical_analysis", { model: AI_MODEL, inputChars: input.length });
  try {
    const response = await perf.span("provider", () => getOpenAI().responses.parse({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You analyze German lexical units for U-Vocab. Prefer complete usable lexical patterns, collocations, cases, and prepositions over isolated translations. Return natural English and Persian meanings.",
        },
        { role: "user", content: input },
      ],
      text: { format: zodTextFormat(lexicalAnalysisSchema, "lexical_analysis") },
    }));

    if (!response.output_parsed) {
      await recordAIUsage({
        userId,
        operation: "lexical_analysis",
        model: AI_MODEL,
        status: "ERROR",
        usage: response.usage,
        requestId: response.id,
        errorMessage: "OpenAI returned no parsed lexical analysis.",
      });
      throw new Error("OpenAI did not return a valid lexical analysis.");
    }

    await recordAIUsage({
      userId,
      operation: "lexical_analysis",
      model: AI_MODEL,
      status: "SUCCESS",
      usage: response.usage,
      requestId: response.id,
    });

    perf.success({
      requestId: response.id,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });

    return response.output_parsed;
  } catch (error) {
    perf.fail(error);
    if (!(error instanceof Error && error.message === "OpenAI did not return a valid lexical analysis.")) {
      await recordAIUsage({
        userId,
        operation: "lexical_analysis",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown OpenAI error",
      });
    }
    throw error;
  }
}
