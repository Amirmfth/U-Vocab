import { cookies } from "next/headers";
import type { UiLocale as PrismaUiLocale } from "@prisma/client";
import { createTranslator } from "./core";
import { UI_LOCALE_COOKIE } from "./preference";
import {
  DEFAULT_UI_LOCALE,
  isUiLocale,
  uiLocaleFromDb,
  type UiLocale,
} from "./config";


export async function resolveUiLocale(
  user?: { uiLocale: PrismaUiLocale | null } | null,
): Promise<UiLocale> {
  if (user?.uiLocale) return uiLocaleFromDb(user.uiLocale);

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(UI_LOCALE_COOKIE)?.value;
  return isUiLocale(cookieLocale) ? cookieLocale : DEFAULT_UI_LOCALE;
}

export async function getServerTranslator(
  user?: { uiLocale: PrismaUiLocale | null } | null,
) {
  const locale = await resolveUiLocale(user);
  return { locale, t: createTranslator(locale) };
}
