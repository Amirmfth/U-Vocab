import type { ExerciseType, TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import type { ExerciseLexeme, LearnerSnapshot } from "@/lib/exercises/types";

export type ReviewCardFamily =
  | "GERMAN_MEANING"
  | "MEANING_GERMAN";

export type ReviewContentLanguage = "de" | "en" | "fa";

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
  const translation =
    lexeme.translations.find((item) =>
      isTranslationVisible(preference, item.language),
    ) ?? lexeme.translations[0];

  return {
    text: translation?.text ?? "",
    language: translation?.language === "fa" ? ("fa" as const) : ("en" as const),
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
      family: "MEANING_GERMAN",
      exerciseType: "REVERSE_RECALL",
      front: {
        prompt: translated.text || "Recall the German lexical unit.",
        hint: lexeme.partOfSpeech.toLowerCase(),
        language: translated.text ? translated.language : "en",
      },
      back: {
        answer: label,
        details: pattern ? [pattern] : [],
        language: "de",
        detailsLanguage: "de",
      },
    };
  }

  return {
    family: "GERMAN_MEANING",
    exerciseType: "MEANING_RECALL",
    front: {
      prompt: label,
      language: "de",
    },
    back: {
      answer: translated.text,
      details: [
        pattern ?? "",
        lexeme.examples[0]?.targetText ?? "",
      ].filter(Boolean),
      language: translated.language,
      detailsLanguage: "de",
    },
  };
}
