import type { TargetLanguage } from "@prisma/client";

export type TargetLanguageConfig = {
  code: "de" | "fr" | "en";
  locale: "de-DE" | "fr-FR" | "en-US";
  label: string;
  enabled: boolean;
  capabilities: {
    vocabulary: boolean;
    grammar: boolean;
    reading: boolean;
    writing: boolean;
    conversation: boolean;
  };
};

export const TARGET_LANGUAGE_CONFIG: Record<TargetLanguage, TargetLanguageConfig> = {
  GERMAN: {
    code: "de",
    locale: "de-DE",
    label: "German",
    enabled: true,
    capabilities: {
      vocabulary: true,
      grammar: true,
      reading: true,
      writing: true,
      conversation: true,
    },
  },
  FRENCH: {
    code: "fr",
    locale: "fr-FR",
    label: "French",
    enabled: false,
    capabilities: {
      vocabulary: false,
      grammar: false,
      reading: false,
      writing: false,
      conversation: false,
    },
  },
  ENGLISH: {
    code: "en",
    locale: "en-US",
    label: "English",
    enabled: false,
    capabilities: {
      vocabulary: false,
      grammar: false,
      reading: false,
      writing: false,
      conversation: false,
    },
  },
};

export function targetLanguageConfig(language: TargetLanguage) {
  return TARGET_LANGUAGE_CONFIG[language];
}

export const ENABLED_TARGET_LANGUAGES = (
  Object.entries(TARGET_LANGUAGE_CONFIG) as Array<[TargetLanguage, TargetLanguageConfig]>
)
  .filter(([, config]) => config.enabled)
  .map(([language]) => language);
