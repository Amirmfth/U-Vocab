const TRANSCRIPTION_LANGUAGE_CODES: Record<string, string> = {
  GERMAN: "de",
  FRENCH: "fr",
  ENGLISH: "en",
  SPANISH: "es",
  ITALIAN: "it",
  PORTUGUESE: "pt",
  DUTCH: "nl",
  POLISH: "pl",
  TURKISH: "tr",
  PERSIAN: "fa",
};

export function transcriptionLanguageForTarget(targetLanguage: string) {
  return TRANSCRIPTION_LANGUAGE_CODES[targetLanguage.toUpperCase()] ?? null;
}

export function documentLanguageForTarget(targetLanguage: string) {
  return transcriptionLanguageForTarget(targetLanguage) ?? "und";
}

export function directionForTarget(targetLanguage: string): "ltr" | "rtl" {
  return targetLanguage.toUpperCase() === "PERSIAN" ? "rtl" : "ltr";
}
