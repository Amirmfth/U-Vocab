import type { TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";

const STOPWORDS: Record<"de" | "fr" | "en", Set<string>> = {
  de: new Set([
    "aber","alle","als","also","am","an","auch","auf","aus","bei","bin","bis","bist",
    "da","dadurch","daher","darum","das","dass","dein","deine","dem","den","der","des",
    "die","dies","diese","doch","dort","du","durch","ein","eine","einem","einen","einer",
    "er","es","für","hat","habe","haben","hier","ich","im","in","ist","ja","jede","jeder",
    "kein","keine","mit","muss","nach","nicht","noch","nun","nur","oder","sein","seine",
    "sich","sie","sind","so","über","um","und","uns","unter","vom","von","vor","war","was",
    "weil","wenn","wie","wieder","wir","wird","wo","zu","zum","zur",
  ]),
  fr: new Set([
    "alors","au","aux","avec","ce","ces","cette","comme","dans","de","des","du","elle","elles",
    "en","est","et","être","il","ils","je","la","le","les","leur","leurs","lui","mais","me",
    "mes","moi","mon","ne","nos","notre","nous","on","ou","par","pas","pour","que","qui",
    "sa","se","ses","si","son","sont","sur","ta","te","tes","toi","ton","tu","un","une",
    "vos","votre","vous","y","à","ça","c'est","j'ai","d'un","d'une","l'",
  ]),
  en: new Set([
    "a","an","and","are","as","at","be","by","for","from","has","have","he","her","his","i",
    "in","is","it","its","me","my","not","of","on","or","our","she","that","the","their",
    "them","they","this","to","us","was","we","were","with","you","your",
  ]),
};

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function normalizedTargetTokens(
  text: string,
  targetLanguage: TargetLanguage = "GERMAN",
) {
  const config = targetLanguageConfig(targetLanguage);
  const normalized = text
    .normalize("NFKC")
    .replace(/[’‘`´]/gu, "'")
    .toLocaleLowerCase(config.locale);

  if (config.code === "fr") {
    return normalized.match(/[a-zàâçéèêëîïôûùüÿœæ][a-zàâçéèêëîïôûùüÿœæ'-]{1,}/gu) ?? [];
  }
  if (config.code === "de") {
    return normalized.match(/[a-zäöüß][a-zäöüß'-]{2,}/gu) ?? [];
  }
  return normalized.match(/[a-z][a-z'-]{2,}/gu) ?? [];
}

export const normalizedGermanTokens = (text: string) =>
  normalizedTargetTokens(text, "GERMAN");

export function detectRepeatedWords(
  text: string,
  minimum = 3,
  targetLanguage: TargetLanguage = "GERMAN",
) {
  const counts = new Map<string, number>();
  const config = targetLanguageConfig(targetLanguage);
  const stopwords = STOPWORDS[config.code];
  for (const token of normalizedTargetTokens(text, targetLanguage)) {
    if (stopwords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return Array.from(counts, ([word, count]) => ({ word, count }))
    .filter((item) => item.count >= minimum)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function detectLexemePresence(
  text: string,
  lemmas: string[],
  targetLanguage: TargetLanguage = "GERMAN",
) {
  const config = targetLanguageConfig(targetLanguage);
  const haystack =
    " " +
    text
      .normalize("NFKC")
      .replace(/[’‘`´]/gu, "'")
      .toLocaleLowerCase(config.locale)
      .replace(/[^\p{L}\p{M}'-]+/gu, " ") +
    " ";
  return lemmas.filter((lemma) => {
    const needle = lemma
      .normalize("NFKC")
      .replace(/[’‘`´]/gu, "'")
      .toLocaleLowerCase(config.locale)
      .trim();
    return needle.length >= 2 && haystack.includes(" " + needle + " ");
  });
}

export function rankReadingCandidates(
  text: string,
  knownLemmas: Set<string>,
  limit = 30,
  targetLanguage: TargetLanguage = "GERMAN",
) {
  const counts = new Map<string, number>();
  const config = targetLanguageConfig(targetLanguage);
  const stopwords = STOPWORDS[config.code];
  for (const token of normalizedTargetTokens(text, targetLanguage)) {
    if (stopwords.has(token) || knownLemmas.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts, ([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count || b.token.length - a.token.length)
    .slice(0, limit);
}

export function buildReadingExcerpt(
  text: string,
  candidates: Array<{ token: string }>,
  maxChars = 12_000,
  targetLanguage: TargetLanguage = "GERMAN",
) {
  if (text.length <= maxChars) return text;

  const candidateSet = new Set(candidates.map((item) => item.token));
  const sentences = text.split(/(?<=[.!?])\s+/u);
  const selected = sentences.filter((sentence) => {
    const tokens = normalizedTargetTokens(sentence, targetLanguage);
    return tokens.some((token) => candidateSet.has(token));
  });

  const joined = selected.join(" ");
  if (joined.length >= 500) return joined.slice(0, maxChars);
  return text.slice(0, maxChars);
}
