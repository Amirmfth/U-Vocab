import { en, type MessageKey } from "./en";
import { fa } from "./fa";
import type { UiLocale } from "./config";

type MessageParams = Record<string, string | number>;

const dictionaries = { en, fa } as const;

function interpolate(template: string, params: MessageParams = {}) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export function translate(locale: UiLocale, key: MessageKey, params?: MessageParams) {
  const dictionary = dictionaries[locale];
  const message = dictionary[key] ?? en[key];

  if (message === undefined) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Missing i18n message: ${key}`);
    }
    return key;
  }

  return interpolate(message, params);
}

export function translatePlural(
  locale: UiLocale,
  keys: { one: MessageKey; other: MessageKey },
  count: number,
  params: MessageParams = {},
) {
  const category = new Intl.PluralRules(locale === "fa" ? "fa-IR" : "en").select(count);
  const key = category === "one" ? keys.one : keys.other;
  return translate(locale, key, { ...params, count });
}

export function createTranslator(locale: UiLocale) {
  return Object.assign(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    {
      plural: (
        keys: { one: MessageKey; other: MessageKey },
        count: number,
        params?: MessageParams,
      ) => translatePlural(locale, keys, count, params),
    },
  );
}

export type Translator = ReturnType<typeof createTranslator>;
export type { MessageKey };
