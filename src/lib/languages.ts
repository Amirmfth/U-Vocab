import type { TargetLanguage } from "@prisma/client";

export type TargetLanguageConfig = {
  code: "de" | "fr" | "en";
  locale: "de-DE" | "fr-FR" | "en-US";
  label: string;
  nativeLabel: string;
  promptName: string;
  enabled: boolean;
  conversationFormality: {
    casual: string;
    formal: string;
    neutral: string;
  };
  capabilities: {
    vocabulary: boolean;
    grammar: boolean;
    reading: boolean;
    writing: boolean;
    conversation: boolean;
  };
};

function flagEnabled(name: string) {
  return process.env[name] === "true" || process.env[name] === "1";
}

export const FRENCH_TARGET_LANGUAGE_ENABLED =
  flagEnabled("NEXT_PUBLIC_ENABLE_FRENCH_TARGET_LANGUAGE") ||
  flagEnabled("ENABLE_FRENCH_TARGET_LANGUAGE");

export const TARGET_LANGUAGE_CONFIG: Record<TargetLanguage, TargetLanguageConfig> = {
  GERMAN: {
    code: "de",
    locale: "de-DE",
    label: "German",
    nativeLabel: "Deutsch",
    promptName: "German",
    enabled: true,
    conversationFormality: {
      casual: "Use du consistently unless the scenario explicitly requires otherwise.",
      formal: "Use Sie consistently and model socially appropriate formal German.",
      neutral: "Use the form of address that naturally fits the scenario and keep it consistent.",
    },
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
    nativeLabel: "Français",
    promptName: "French",
    enabled: FRENCH_TARGET_LANGUAGE_ENABLED,
    conversationFormality: {
      casual: "Use tu consistently unless the scenario explicitly requires otherwise.",
      formal: "Use vous consistently and model socially appropriate formal French.",
      neutral: "Use tu or vous according to the scenario and keep that choice consistent.",
    },
    capabilities: {
      vocabulary: true,
      grammar: true,
      reading: true,
      writing: true,
      conversation: true,
    },
  },
  ENGLISH: {
    code: "en",
    locale: "en-US",
    label: "English",
    nativeLabel: "English",
    promptName: "English",
    enabled: false,
    conversationFormality: {
      casual: "Use a natural casual register.",
      formal: "Use a natural formal register.",
      neutral: "Use the register that naturally fits the scenario.",
    },
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

export function targetLanguageFromCode(code: string): TargetLanguage | null {
  const entry = (
    Object.entries(TARGET_LANGUAGE_CONFIG) as Array<
      [TargetLanguage, TargetLanguageConfig]
    >
  ).find(([, config]) => config.code === code);
  return entry?.[0] ?? null;
}

export function targetLanguagePrompt(language: TargetLanguage) {
  const config = targetLanguageConfig(language);
  return {
    language,
    code: config.code,
    locale: config.locale,
    name: config.promptName,
    nativeName: config.nativeLabel,
  };
}

export function isTargetLanguageCapabilityEnabled(
  language: TargetLanguage,
  capability: keyof TargetLanguageConfig["capabilities"],
) {
  const config = targetLanguageConfig(language);
  return config.enabled && config.capabilities[capability];
}

export const ENABLED_TARGET_LANGUAGES = (
  Object.entries(TARGET_LANGUAGE_CONFIG) as Array<
    [TargetLanguage, TargetLanguageConfig]
  >
)
  .filter(([, config]) => config.enabled)
  .map(([language]) => language);
