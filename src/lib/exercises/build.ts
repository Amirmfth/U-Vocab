import type { TranslationLanguage } from "@prisma/client";
import { isTranslationVisible } from "@/lib/translations";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import type { ExerciseDefinition, ExerciseLexeme } from "./types";

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
  const expected = tokens[index].replace(/^[^\p{L}]*/u, "").replace(/[^\p{L}äöüß]*$/iu, "");
  if (!expected) return null;
  const hidden = tokens[index].replace(expected, "_____");
  return { prompt: [...tokens.slice(0,index),hidden,...tokens.slice(index+1)].join(""), expected };
}

export function eligibleExerciseTypes(lexeme: ExerciseLexeme): ExerciseDefinition["type"][] {
  const result: ExerciseDefinition["type"][] = ["MEANING_RECALL", "REVERSE_RECALL"];
  if (lexeme.partOfSpeech === "NOUN" && lexeme.article) result.push("ARTICLE");
  if (lexeme.patterns.length) result.push("CASE_PREPOSITION", "COLLOCATION");
  if (lexeme.examples.some((example) => buildCloze(example.german, lexeme.lemma))) result.push("CLOZE");
  if (lexeme.examples.length) result.push("CONTEXTUAL_CHOICE");
  return result;
}

export function buildExercise(
  type: ExerciseDefinition["type"],
  lexeme: ExerciseLexeme,
  preference: TranslationLanguage,
): ExerciseDefinition {
  const meaning = preferredMeaning(lexeme, preference);
  const pattern = lexeme.patterns[0]?.pattern;
  const example = lexeme.examples[0]?.german;
  const cloze = lexeme.examples.map((item) => buildCloze(item.german, lexeme.lemma)).find(Boolean);

  switch (type) {
    case "MEANING_RECALL":
      return { type, prompt:"What does “"+lexeme.lemma+"” mean?", expected:meaning, interaction:"short_text", skill:"meaning", requiresAI:false };
    case "REVERSE_RECALL":
      return { type, prompt:"Write the German lexical unit for: "+meaning, expected:lexeme.partOfSpeech==="NOUN"?formatLexemeLabel(lexeme):lexeme.lemma, interaction:"short_text", skill:"production", hint:pattern??undefined, requiresAI:false };
    case "ARTICLE":
      return { type, prompt:"Choose the article for “"+lexeme.lemma+"”.", expected:lexeme.article??"", options:["der","die","das"], interaction:"choice", skill:"grammar", requiresAI:false };
    case "CASE_PREPOSITION":
      if (pattern) return { type, prompt:"Complete the stored grammar pattern for “"+lexeme.lemma+"”.", expected:pattern, interaction:"short_text", skill:"grammar", requiresAI:false };
      break;
    case "COLLOCATION":
      if (pattern) return { type, prompt:"Recall a useful stored pattern for “"+lexeme.lemma+"”.", expected:pattern, interaction:"short_text", skill:"production", requiresAI:false };
      break;
    case "CLOZE":
      if (cloze) return { type, prompt:"Complete the sentence:\n"+cloze.prompt, expected:cloze.expected, interaction:"short_text", skill:"context", requiresAI:false };
      break;
    case "CONTEXTUAL_CHOICE":
      if (example) {
        const distractor="Ich benutze „"+lexeme.lemma+"“ ohne passenden Kontext.";
        return { type, prompt:"Which sentence is the natural saved context for “"+lexeme.lemma+"”?", expected:example, options:[example,distractor], interaction:"choice", skill:"context", requiresAI:false };
      }
      break;
  }

  return {
    type:"REVERSE_RECALL",
    prompt:"Write the German lexical unit for: "+meaning,
    expected:lexeme.lemma || formatLexemeLabel(lexeme),
    interaction:"short_text",
    skill:"production",
    requiresAI:false,
  };
}
