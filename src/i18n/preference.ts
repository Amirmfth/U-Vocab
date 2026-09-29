import type { UiLocale as PrismaUiLocale } from "@prisma/client";
import {
  isUiLocale,
  uiLocaleToDb,
  type UiLocale,
} from "./config";

export const UI_LOCALE_COOKIE = "u-vocab-ui-locale";

export type UiLocalePreference = {
  locale: UiLocale;
  dbLocale: PrismaUiLocale;
  cookieLocale: UiLocale;
};

export function parseUiLocalePreference(
  value: unknown,
): UiLocalePreference | null {
  if (!isUiLocale(value)) return null;
  return {
    locale: value,
    dbLocale: uiLocaleToDb(value),
    cookieLocale: value,
  };
}
