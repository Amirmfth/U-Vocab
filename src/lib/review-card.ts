import type { ExerciseType, TranslationLanguage } from "@prisma/client";
import { preferredLexicalMeaning } from "@/lib/lexical-meaning";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import type { ExerciseLexeme, LearnerSnapshot } from "@/lib/exercises/types";

export type ReviewCardFamily =
  | "TARGET_MEANING"
  | "MEANING_TARGET";

export type ReviewContentLanguage = "de" | "fr" | "en" | "fa";

export type ReviewCardDefinition = {
  family: ReviewCardFamily;
  exerciseType: ExerciseType;
  front: {
    prompt: string;
    hint?: string;
    language: ReviewContentLanguage;
  };
  back: {
    answer: string;
    details: string[];
    language: ReviewContentLanguage;
    detailsLanguage: ReviewContentLanguage;
  };
};

function meaning(lexeme: ExerciseLexeme, preference: TranslationLanguage) {
  const resolved = preferredLexicalMeaning(lexeme, preference);
  return {
    text: resolved.text,
    language:
      resolved.language === "fa"
        ? ("fa" as const)
        : resolved.language === "fr"
          ? ("fr" as const)
          : resolved.language === "de"
            ? ("de" as const)
            : ("en" as const),
  };
}

export function buildReviewCard(input: {
  lexeme: ExerciseLexeme;
  preference: TranslationLanguage;
  snapshot: LearnerSnapshot;
  recentTypes: ExerciseType[];
}): ReviewCardDefinition {
  const { lexeme, snapshot, recentTypes } = input;
  const translated = meaning(lexeme, input.preference);
  const label = formatLexemeLabel(lexeme);
  const pattern = lexeme.patterns[0]?.pattern;

  if (
    snapshot.production < snapshot.meaningRecall ||
    recentTypes[0] === "MEANING_RECALL"
  ) {
    return {
      family: "MEANING_TARGET",
      exerciseType: "REVERSE_RECALL",
      front: {
        prompt: translated.text || "Recall the target-language lexical unit.",
        hint: lexeme.partOfSpeech.toLowerCase(),
        language: translated.text ? translated.language : "en",
      },
      back: {
        answer: label,
        details: pattern ? [pattern] : [],
        language: (lexeme.language === "fr" ? "fr" : lexeme.language === "en" ? "en" : "de"),
        detailsLanguage: (lexeme.language === "fr" ? "fr" : lexeme.language === "en" ? "en" : "de"),
      },
    };
  }

  return {
    family: "TARGET_MEANING",
    exerciseType: "MEANING_RECALL",
    front: {
      prompt: label,
      language: (lexeme.language === "fr" ? "fr" : lexeme.language === "en" ? "en" : "de"),
    },
    back: {
      answer: translated.text,
      details: [
        pattern ?? "",
        lexeme.examples[0]?.targetText ?? "",
      ].filter(Boolean),
      language: translated.language,
      detailsLanguage: (lexeme.language === "fr" ? "fr" : lexeme.language === "en" ? "en" : "de"),
    },
  };
}
