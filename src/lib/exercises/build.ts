import type { TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import type { ExerciseDefinition, ExerciseLexeme } from "./types";
import { formatLexemeLabel } from "@/lib/lexeme-display";

function preferredMeaning(lexeme: ExerciseLexeme, preference: TranslationLanguage) {
  return (
    lexeme.translations.find((translation) =>
      isTranslationVisible(preference, translation.language),
    )?.text ?? lexeme.translations[0]?.text ?? ""
  );
}

function cloze(sentence: string, lemma: string) {
  const index = sentence.toLocaleLowerCase("de-DE").indexOf(
    lemma.toLocaleLowerCase("de-DE"),
  );
  if (index < 0) return sentence + "\nTarget: " + lemma;
  return sentence.slice(0, index) + "_____" + sentence.slice(index + lemma.length);
}

export function buildExercise(
  type: ExerciseDefinition["type"],
  lexeme: ExerciseLexeme,
  preference: TranslationLanguage,
): ExerciseDefinition {
  const meaning = preferredMeaning(lexeme, preference);
  const pattern = lexeme.patterns[0]?.pattern;
  const example = lexeme.examples[0]?.german;

  switch (type) {
    case "MEANING_RECALL":
      return { type, prompt: "What does “" + lexeme.lemma + "” mean?", expected: meaning, requiresAI: false };
    case "REVERSE_RECALL":
      return { type, prompt: "Write the German lexical unit for: " + meaning, expected: lexeme.lemma, hint: pattern ?? undefined, requiresAI: false };
    case "ARTICLE":
      return { type, prompt: "Write the correct article + noun for “" + lexeme.lemma + "”.", expected: formatLexemeLabel(lexeme), requiresAI: false };
    case "CASE_PREPOSITION":
      return { type, prompt: pattern ? "Write the complete grammatical pattern for “" + lexeme.lemma + "”." : "Use “" + lexeme.lemma + "” in a sentence with the correct grammatical pattern.", expected: pattern, requiresAI: !pattern };
    case "COLLOCATION":
      return { type, prompt: pattern ? "Reproduce a useful lexical pattern for “" + lexeme.lemma + "” from memory." : "Write a natural collocation using “" + lexeme.lemma + "”.", expected: pattern, requiresAI: true };
    case "CLOZE":
      return { type, prompt: example ? "Complete the sentence with the target lexical unit:\n" + cloze(example, lexeme.lemma) : "Write a sentence that correctly uses “" + lexeme.lemma + "”.", expected: lexeme.lemma, requiresAI: true };
    case "PARAPHRASE":
      return { type, prompt: example ? "Rewrite this idea while naturally using “" + lexeme.lemma + "”:\n" + example : "Express an idea using “" + lexeme.lemma + "” without translating word-for-word.", requiresAI: true };
    case "CONTEXTUAL_CHOICE":
      return { type, prompt: "Explain when “" + lexeme.lemma + "” is appropriate and give one natural example.", requiresAI: true };
    case "FREE_SENTENCE":
    default:
      return { type: "FREE_SENTENCE", prompt: "Write a natural German sentence using “" + lexeme.lemma + "”.", hint: pattern ?? undefined, requiresAI: true };
  }
}
