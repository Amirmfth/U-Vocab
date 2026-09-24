import type { TranslationLanguage } from "@prisma/client";

export function isTranslationVisible(
  preference: TranslationLanguage,
  language: string,
) {
  if (preference === "BOTH") return language === "en" || language === "fa";
  if (preference === "PERSIAN") return language === "fa";
  return language === "en";
}

export function translationLabel(code: string) {
  return code === "fa" ? "فارسی" : "English";
}
