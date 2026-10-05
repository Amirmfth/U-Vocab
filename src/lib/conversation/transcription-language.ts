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
