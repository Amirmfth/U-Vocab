import { zodTextFormat } from "openai/helpers/zod";
import { AI_MODEL, getOpenAI } from "./client";
import { lexicalAnalysisSchema } from "./schemas";

export async function analyzeGermanLexeme(input: string) {
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
    throw new Error("OpenAI did not return a valid lexical analysis.");
  }

  return response.output_parsed;
}
