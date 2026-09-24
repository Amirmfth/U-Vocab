import type { PartOfSpeech } from "@prisma/client";
import type { IngestionAdapter, IngestionCandidate } from "./types";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function asPartOfSpeech(value: string): PartOfSpeech {
  const normalized = value.trim().toUpperCase();
  const allowed = new Set([
    "NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION",
    "CONJUNCTION","INTERJECTION","PHRASE","OTHER",
  ]);
  return allowed.has(normalized) ? (normalized as PartOfSpeech) : "OTHER";
}

export const csvAdapter: IngestionAdapter<string> = {
  sourceType: "CSV",
  async parse(input) {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((header) =>
      header.toLocaleLowerCase("en-US"),
    );

    const index = (names: string[]) =>
      headers.findIndex((header) => names.includes(header));

    const lemmaIndex = index(["german", "lemma", "word", "phrase"]);
    const englishIndex = index(["english", "en", "meaning_en"]);
    const persianIndex = index(["persian", "fa", "farsi", "meaning_fa"]);
    const posIndex = index(["pos", "partofspeech", "part_of_speech"]);
    const articleIndex = index(["article"]);
    const pluralIndex = index(["plural"]);
    const patternIndex = index(["pattern", "grammar"]);

    if (lemmaIndex < 0) {
      throw new Error("CSV needs a German/lemma/word/phrase column.");
    }

    const candidates: IngestionCandidate[] = [];

    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      const lemma = values[lemmaIndex]?.trim();
      if (!lemma) continue;

      const partOfSpeech = asPartOfSpeech(values[posIndex] ?? "OTHER");
      const normalized = lemma.toLocaleLowerCase("de-DE");

      candidates.push({
        key: normalized + ":" + partOfSpeech,
        sourceType: "CSV",
        lemma,
        normalized,
        partOfSpeech,
        article: articleIndex >= 0 ? values[articleIndex] || null : null,
        plural: pluralIndex >= 0 ? values[pluralIndex] || null : null,
        englishMeaning: englishIndex >= 0 ? values[englishIndex] ?? "" : "",
        persianMeaning: persianIndex >= 0 ? values[persianIndex] ?? "" : "",
        pattern: patternIndex >= 0 ? values[patternIndex] || null : null,
      });
    }

    return candidates;
  },
};
