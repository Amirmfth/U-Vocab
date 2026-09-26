import type { TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { deterministicChoiceOptions } from "./options";
import type {
  ExerciseDefinition,
  ExerciseLexeme,
  ExerciseOptionPools,
} from "./types";

function preferredMeaning(lexeme: ExerciseLexeme, preference: TranslationLanguage) {
  return lexeme.translations.find((translation) =>
    isTranslationVisible(preference, translation.language),
  )?.text ?? lexeme.translations[0]?.text ?? "";
}

function cleanToken(value: string) {
  return value.toLocaleLowerCase("de-DE").replace(/[^\p{L}äöüß]/gu, "");
}

export function buildCloze(sentence: string, lemma: string) {
  const tokens = sentence.split(/(\s+)/);
  const target = cleanToken(lemma);
  const stem = target.endsWith("en") ? target.slice(0, -2) : target;
  const index = tokens.findIndex((token) => {
    const cleaned = cleanToken(token);
    return cleaned === target || (stem.length >= 3 && cleaned.startsWith(stem));
  });
  if (index < 0) return null;
  const expected = tokens[index]
    .replace(/^[^\p{L}]*/u, "")
    .replace(/[^\p{L}äöüß]*$/iu, "");
  if (!expected) return null;
  const hidden = tokens[index].replace(expected, "_____");
  return {
    prompt: [...tokens.slice(0, index), hidden, ...tokens.slice(index + 1)].join(""),
    expected,
  };
}

export function eligibleExerciseTypes(lexeme: ExerciseLexeme): ExerciseDefinition["type"][] {
  const result: ExerciseDefinition["type"][] = ["MEANING_RECALL", "REVERSE_RECALL"];
  if (lexeme.partOfSpeech === "NOUN" && lexeme.article) result.push("ARTICLE");
  if (lexeme.patterns.length) result.push("CASE_PREPOSITION", "COLLOCATION");
  if (lexeme.examples.some((example) => buildCloze(example.german, lexeme.lemma))) result.push("CLOZE");
  if (lexeme.examples.length) result.push("CONTEXTUAL_CHOICE");
  return result;
}

function choiceOrText(
  base: Omit<ExerciseDefinition, "interaction" | "options">,
  pool: Array<string | null | undefined>,
): ExerciseDefinition {
  const options = deterministicChoiceOptions(base.expected, pool);
  if (options.length >= 3) {
    return { ...base, interaction: "choice", options };
  }
  return { ...base, interaction: "short_text" };
}

export function buildExercise(
  type: ExerciseDefinition["type"],
  lexeme: ExerciseLexeme,
  preference: TranslationLanguage,
  pools: ExerciseOptionPools = {},
): ExerciseDefinition {
  const meaning = preferredMeaning(lexeme, preference);
  const pattern = lexeme.patterns[0]?.pattern;
  const example = lexeme.examples[0]?.german;
  const cloze = lexeme.examples
    .map((item) => buildCloze(item.german, lexeme.lemma))
    .find(Boolean);

  switch (type) {
    case "MEANING_RECALL":
      return choiceOrText(
        {
          type,
          prompt: "What does “" + lexeme.lemma + "” mean?",
          expected: meaning,
          skill: "meaning",
          requiresAI: false,
        },
        pools.meanings ?? [],
      );
    case "REVERSE_RECALL": {
      const expected =
        lexeme.partOfSpeech === "NOUN"
          ? formatLexemeLabel(lexeme)
          : lexeme.lemma;
      return choiceOrText(
        {
          type,
          prompt: "Which German lexical unit matches: " + meaning,
          expected,
          skill: "production",
          hint: pattern ?? undefined,
          requiresAI: false,
        },
        pools.lemmas ?? [],
      );
    }
    case "ARTICLE":
      return {
        type,
        prompt: "Choose the article for “" + lexeme.lemma + "”.",
        expected: lexeme.article ?? "",
        options: ["der", "die", "das"],
        interaction: "choice",
        skill: "grammar",
        requiresAI: false,
      };
    case "CASE_PREPOSITION":
      if (pattern) {
        return choiceOrText(
          {
            type,
            prompt: "Which stored grammar pattern belongs to “" + lexeme.lemma + "”?",
            expected: pattern,
            skill: "grammar",
            requiresAI: false,
          },
          pools.patterns ?? [],
        );
      }
      break;
    case "COLLOCATION":
      if (pattern) {
        return choiceOrText(
          {
            type,
            prompt: "Which lexical pattern belongs to “" + lexeme.lemma + "”?",
            expected: pattern,
            skill: "production",
            requiresAI: false,
          },
          pools.patterns ?? [],
        );
      }
      break;
    case "CLOZE":
      if (cloze) {
        return choiceOrText(
          {
            type,
            prompt: "Complete the sentence:\n" + cloze.prompt,
            expected: cloze.expected,
            skill: "context",
            requiresAI: false,
          },
          pools.lemmas ?? [],
        );
      }
      break;
    case "CONTEXTUAL_CHOICE":
      if (example) {
        return choiceOrText(
          {
            type,
            prompt: "Which sentence is the saved natural context for “" + lexeme.lemma + "”?",
            expected: example,
            skill: "context",
            requiresAI: false,
          },
          pools.examples ?? [],
        );
      }
      break;
  }

  return choiceOrText(
    {
      type: "REVERSE_RECALL",
      prompt: "Which German lexical unit matches: " + meaning,
      expected: lexeme.lemma || formatLexemeLabel(lexeme),
      skill: "production",
      requiresAI: false,
    },
    pools.lemmas ?? [],
  );
}
