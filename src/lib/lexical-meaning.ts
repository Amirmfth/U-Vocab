import type { TranslationLanguage } from "@prisma/client";

export type LexicalMeaningSource = {
  language?: string;
  translations: Array<{ language: string; text: string }>;
  definitions?: Array<{ language: string; text: string }>;
};

export function preferredLexicalMeaning(
  lexeme: LexicalMeaningSource,
  preference: TranslationLanguage,
) {
  const targetLanguage = lexeme.language ?? "de";
  const preferredCode = preference === "PERSIAN" ? "fa" : "en";

  const translation = lexeme.translations.find(
    (item) =>
      item.language === preferredCode &&
      item.language !== targetLanguage,
  );
  if (translation) {
    return {
      text: translation.text,
      language: translation.language,
      kind: "translation" as const,
    };
  }

  if (preferredCode === targetLanguage) {
    const definition = lexeme.definitions?.find(
      (item) => item.language === targetLanguage,
    );
    if (definition) {
      return {
        text: definition.text,
        language: definition.language,
        kind: "definition" as const,
      };
    }
  }

  const fallbackTranslation = lexeme.translations.find(
    (item) => item.language !== targetLanguage,
  );
  if (fallbackTranslation) {
    return {
      text: fallbackTranslation.text,
      language: fallbackTranslation.language,
      kind: "translation" as const,
    };
  }

  const fallbackDefinition =
    lexeme.definitions?.find((item) => item.language === targetLanguage) ??
    lexeme.definitions?.[0];
  if (fallbackDefinition) {
    return {
      text: fallbackDefinition.text,
      language: fallbackDefinition.language,
      kind: "definition" as const,
    };
  }

  return {
    text: "",
    language: preferredCode,
    kind: "missing" as const,
  };
}

export function visibleLexicalMeanings(
  lexeme: LexicalMeaningSource,
  preference: TranslationLanguage,
) {
  const targetLanguage = lexeme.language ?? "de";
  if (preference === "BOTH") {
    const rows = [
      ...lexeme.translations
        .filter((item) => item.language !== targetLanguage)
        .map((item) => ({ ...item, kind: "translation" as const })),
      ...(lexeme.definitions ?? [])
        .filter((item) => item.language === targetLanguage)
        .map((item) => ({ ...item, kind: "definition" as const })),
    ];
    return Array.from(
      new Map(rows.map((item) => [item.kind + ":" + item.language + ":" + item.text, item])).values(),
    );
  }

  const preferred = preferredLexicalMeaning(lexeme, preference);
  return preferred.text ? [preferred] : [];
}
