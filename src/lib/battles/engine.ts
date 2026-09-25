import type { BattleGame } from "@prisma/client";
import { db } from "@/lib/db";
import { formatLexemeLabel } from "@/lib/lexeme-display";

type BattleQuestionDraft = {
  lexemeId: string | null;
  prompt: string;
  options: string[];
  expected: string;
  explanation: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function deterministicOptions(expected: string, pool: string[], limit = 4) {
  const values = unique([expected, ...pool.filter((item) => item !== expected)]).slice(0, limit);
  if (values.length < 2) return values;
  const offset =
    Array.from(expected).reduce((sum, character) => sum + character.codePointAt(0)!, 0) %
    values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function prepositionFrom(pattern: string) {
  const match = pattern.match(/\b(an|auf|aus|bei|für|gegen|in|mit|nach|über|um|von|vor|zu)\b/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function buildBattleQuestions(input: {
  userId: string;
  game: BattleGame;
  count?: number;
}) {
  const count = input.count ?? 8;
  const vocabulary = await db.userVocabulary.findMany({
    where: { userId: input.userId },
    include: {
      lexeme: {
        include: {
          translations: true,
          patterns: true,
          outgoing: {
            include: { target: true },
            where: { type: { in: ["SYNONYM", "RELATED"] } },
          },
        },
      },
    },
    orderBy: [
      { production: "asc" },
      { contextualUsage: "asc" },
      { meaningRecall: "asc" },
    ],
    take: 100,
  });

  const drafts: BattleQuestionDraft[] = [];
  const englishPool = unique(
    vocabulary.flatMap((item) =>
      item.lexeme.translations
        .filter((translation) => translation.language === "en")
        .map((translation) => translation.text),
    ),
  );
  const patternPool = unique(
    vocabulary.flatMap((item) =>
      item.lexeme.patterns.map((pattern) => pattern.pattern),
    ),
  );
  const lemmaPool = vocabulary.map((item) => item.lexeme.lemma);
  const prepPool = ["an", "auf", "aus", "bei", "für", "gegen", "in", "mit", "nach", "über", "um", "von", "vor", "zu"];

  for (const item of vocabulary) {
    const lexeme = item.lexeme;

    if (input.game === "RAPID_RECALL") {
      const meaning = lexeme.translations.find(
        (translation) => translation.language === "en",
      )?.text;
      if (!meaning) continue;
      drafts.push({
        lexemeId: lexeme.id,
        prompt: "What does “" + lexeme.lemma + "” mean?",
        options: deterministicOptions(meaning, englishPool),
        expected: meaning,
        explanation: null,
      });
    }

    if (input.game === "ARTICLE") {
      if (lexeme.partOfSpeech !== "NOUN" || !lexeme.article) continue;
      drafts.push({
        lexemeId: lexeme.id,
        prompt: "Choose the correct article for “" + lexeme.lemma + "”.",
        options: ["der", "die", "das"],
        expected: lexeme.article,
        explanation:
          formatLexemeLabel(lexeme) +
          (lexeme.plural ? " · Plural: " + lexeme.plural : ""),
      });
    }

    if (input.game === "COLLOCATION") {
      const pattern = lexeme.patterns[0]?.pattern;
      if (!pattern || patternPool.length < 2) continue;
      drafts.push({
        lexemeId: lexeme.id,
        prompt: "Which pattern belongs to “" + lexeme.lemma + "”?",
        options: deterministicOptions(pattern, patternPool),
        expected: pattern,
        explanation: pattern,
      });
    }

    if (input.game === "SYNONYM") {
      const relation = lexeme.outgoing[0];
      if (!relation) continue;
      drafts.push({
        lexemeId: lexeme.id,
        prompt: "Which word is closest in meaning to “" + lexeme.lemma + "”?",
        options: deterministicOptions(relation.target.lemma, lemmaPool),
        expected: relation.target.lemma,
        explanation:
          lexeme.lemma + " ↔ " + relation.target.lemma +
          " (" + relation.type.toLowerCase() + ")",
      });
    }

    if (input.game === "PREPOSITION") {
      const pattern = lexeme.patterns.find((entry) =>
        prepositionFrom(entry.pattern),
      );
      const preposition = pattern ? prepositionFrom(pattern.pattern) : null;
      if (!pattern || !preposition) continue;
      drafts.push({
        lexemeId: lexeme.id,
        prompt: "Which preposition completes the pattern for “" + lexeme.lemma + "”?",
        options: deterministicOptions(preposition, prepPool),
        expected: preposition,
        explanation: pattern.pattern,
      });
    }
  }

  if (input.game === "ODD_ONE_OUT") {
    const byPos = new Map<string, typeof vocabulary>();
    for (const item of vocabulary) {
      byPos.set(item.lexeme.partOfSpeech, [
        ...(byPos.get(item.lexeme.partOfSpeech) ?? []),
        item,
      ]);
    }

    const groups = Array.from(byPos.values()).filter((group) => group.length >= 3);
    for (const group of groups) {
      const odd = vocabulary.find(
        (item) => item.lexeme.partOfSpeech !== group[0].lexeme.partOfSpeech,
      );
      if (!odd) continue;
      const options = deterministicOptions(
        odd.lexeme.lemma,
        group.slice(0, 3).map((item) => item.lexeme.lemma),
      );
      drafts.push({
        lexemeId: odd.lexemeId,
        prompt:
          "Which word is the odd one out by part of speech? The other three are " +
          group[0].lexeme.partOfSpeech.toLowerCase() +
          "s.",
        options,
        expected: odd.lexeme.lemma,
        explanation:
          odd.lexeme.lemma + " is " + odd.lexeme.partOfSpeech.toLowerCase() + ".",
      });
    }
  }

  return drafts.slice(0, count);
}

export function battleExerciseType(game: BattleGame) {
  switch (game) {
    case "RAPID_RECALL":
      return "MEANING_RECALL" as const;
    case "ARTICLE":
      return "ARTICLE" as const;
    case "COLLOCATION":
      return "COLLOCATION" as const;
    case "PREPOSITION":
      return "CASE_PREPOSITION" as const;
    case "ODD_ONE_OUT":
    case "SYNONYM":
      return "CONTEXTUAL_CHOICE" as const;
  }
}
