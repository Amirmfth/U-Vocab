import type { TranslationLanguage } from "@prisma/client";

export function visibleTranslationCodes(preference: TranslationLanguage) {
  if (preference === "PERSIAN") return ["fa"] as const;
  if (preference === "BOTH") return ["en", "fa"] as const;
  return ["en"] as const;
}

export function translationLabel(code: string) {
  return code === "fa" ? "فارسی" : "English";
}
