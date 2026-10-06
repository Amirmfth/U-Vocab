import type { PartOfSpeech, TargetLanguage } from "@prisma/client";
import { targetLanguageConfig } from "@/lib/languages";

export type NormalizedLexicalInput = {
  surface: string;
  normalizedLookup: string;
  lookupVariants: string[];
  articleVariant: string | null;
};

export interface LexiconLanguageAdapter {
  languageCode: string;
  locale: string;
  normalizeInput(input: string): NormalizedLexicalInput;
  normalizeCanonical(lemma: string, partOfSpeech?: PartOfSpeech | null): string;
}

function normalizeFormatting(input: string, locale: string) {
  return input
    .normalize("NFKC")
    .replace(/[’‘`´]/gu, "'")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^[“”„"'«»‹›]+|[“”„"'«»‹›]+$/gu, "")
    .replace(/[,:;]+$/gu, "")
    .trim()
    .toLocaleLowerCase(locale);
}

const germanAdapter: LexiconLanguageAdapter = {
  languageCode: "de",
  locale: "de-DE",
  normalizeInput(input) {
    const surface = input.normalize("NFKC").replace(/\s+/gu, " ").trim();
    const normalizedLookup = normalizeFormatting(surface, this.locale);
    const articleMatch = normalizedLookup.match(/^(der|die|das)\s+(.+)$/u);
    const articleVariant = articleMatch?.[2]?.trim() || null;
    return {
      surface,
      normalizedLookup,
      lookupVariants: Array.from(
        new Set([normalizedLookup, ...(articleVariant ? [articleVariant] : [])]),
      ),
      articleVariant,
    };
  },
  normalizeCanonical(lemma, partOfSpeech) {
    const normalized = normalizeFormatting(lemma, this.locale);
    return partOfSpeech === "NOUN"
      ? normalized.replace(/^(der|die|das)\s+/u, "")
      : normalized;
  },
};

function frenchArticleVariant(normalized: string) {
  const elision = normalized.match(/^l'(.+)$/u);
  if (elision?.[1]) return elision[1].trim();

  const article = normalized.match(
    /^(?:le|la|les|un|une|des|du|de la|de l')\s*(.+)$/u,
  );
  return article?.[1]?.trim() || null;
}

const frenchAdapter: LexiconLanguageAdapter = {
  languageCode: "fr",
  locale: "fr-FR",
  normalizeInput(input) {
    const surface = input
      .normalize("NFKC")
      .replace(/[’‘`´]/gu, "'")
      .replace(/\s+/gu, " ")
      .trim();
    const normalizedLookup = normalizeFormatting(surface, this.locale);
    const articleVariant = frenchArticleVariant(normalizedLookup);
    return {
      surface,
      normalizedLookup,
      lookupVariants: Array.from(
        new Set([normalizedLookup, ...(articleVariant ? [articleVariant] : [])]),
      ),
      articleVariant,
    };
  },
  normalizeCanonical(lemma, partOfSpeech) {
    const normalized = normalizeFormatting(lemma, this.locale);
    if (partOfSpeech !== "NOUN") return normalized;
    return frenchArticleVariant(normalized) ?? normalized;
  },
};

function genericAdapter(language: TargetLanguage): LexiconLanguageAdapter {
  const config = targetLanguageConfig(language);
  return {
    languageCode: config.code,
    locale: config.locale,
    normalizeInput(input) {
      const surface = input.normalize("NFKC").replace(/\s+/gu, " ").trim();
      const normalizedLookup = normalizeFormatting(surface, config.locale);
      return {
        surface,
        normalizedLookup,
        lookupVariants: [normalizedLookup],
        articleVariant: null,
      };
    },
    normalizeCanonical(lemma) {
      return normalizeFormatting(lemma, config.locale);
    },
  };
}

export function lexiconAdapter(language: TargetLanguage): LexiconLanguageAdapter {
  if (language === "GERMAN") return germanAdapter;
  if (language === "FRENCH") return frenchAdapter;
  return genericAdapter(language);
}
