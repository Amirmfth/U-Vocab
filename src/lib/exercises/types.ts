import type { ExerciseType } from "@prisma/client";

export type ExerciseInteraction = "short_text" | "choice";
export type ExerciseSkill = "meaning" | "production" | "grammar" | "context";

export type ExerciseDefinition = {
  type: ExerciseType;
  prompt: string;
  interaction: ExerciseInteraction;
  skill: ExerciseSkill;
  hint?: string;
  expected: string;
  options?: string[];
  requiresAI: false;
};

export type ExerciseLexeme = {
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  translations: { language: string; text: string }[];
  patterns: { pattern: string; explanation: string | null }[];
  examples: { german: string }[];
};

export type LearnerSnapshot = {
  recognition: number;
  meaningRecall: number;
  production: number;
  contextualUsage: number;
  mistakeTypes: string[];
};
