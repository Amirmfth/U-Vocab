import { z } from "zod";

export const lexicalAnalysisSchema = z.object({
  lemma: z.string(),
  partOfSpeech: z.enum([
    "NOUN",
    "VERB",
    "ADJECTIVE",
    "ADVERB",
    "PRONOUN",
    "PREPOSITION",
    "CONJUNCTION",
    "INTERJECTION",
    "PHRASE",
    "OTHER",
  ]),
  article: z.string().nullable(),
  gender: z.string().nullable(),
  plural: z.string().nullable(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  englishMeanings: z.array(z.string()).min(1),
  persianMeanings: z.array(z.string()).min(1),
  patterns: z.array(
    z.object({
      pattern: z.string(),
      explanation: z.string().nullable(),
    }),
  ),
  examples: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      persian: z.string(),
    }),
  ).min(1),
});

export type LexicalAnalysis = z.infer<typeof lexicalAnalysisSchema>;
