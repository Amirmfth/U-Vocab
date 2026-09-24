import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { lexicalAnalysisSchema } from "./schemas";
import { recordAIUsage } from "./usage";

export async function analyzeGermanLexeme(input: string, userId: string) {
  try {
    const response = await getOpenAI().responses.parse({
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
    });

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

    return response.output_parsed;
  } catch (error) {
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
