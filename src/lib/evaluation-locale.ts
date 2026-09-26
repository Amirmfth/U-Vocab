import type { TranslationLanguage } from "@prisma/client";

export type EvaluationLocale = "en" | "fa";

export function evaluationLocaleForPreference(
  preference: TranslationLanguage,
): EvaluationLocale {
  return preference === "PERSIAN" ? "fa" : "en";
}

export function evaluationLanguageInstruction(locale: EvaluationLocale) {
  return locale === "fa"
    ? "Write all explanatory evaluation feedback in Persian (fa). Keep quoted German learner text, corrected German phrases, and improved German examples in German."
    : "Write all explanatory evaluation feedback in English. Keep quoted German learner text, corrected German phrases, and improved German examples in German.";
}
