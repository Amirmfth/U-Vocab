import type { UiLocale } from "./config";
import { createTranslator } from "./core";

function intlLocale(locale: UiLocale) {
  return locale === "fa" ? "fa-IR" : "en";
}

export function formatNumber(
  locale: UiLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

export function formatPercent(
  locale: UiLocale,
  value: number,
  options?: Omit<Intl.NumberFormatOptions, "style">,
) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

export function formatDate(
  locale: UiLocale,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(value));
}

export function formatRelativeTime(
  locale: UiLocale,
  value: Date | string | number,
  now = new Date(),
) {
  const t = createTranslator(locale);
  const diffMs = now.getTime() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (minutes < 1) return t("format.justNow");
  if (minutes < 60) {
    return t.plural(
      { one: "format.minutesAgo.one", other: "format.minutesAgo.other" },
      minutes,
    );
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t.plural(
      { one: "format.hoursAgo.one", other: "format.hoursAgo.other" },
      hours,
    );
  }

  const days = Math.floor(hours / 24);
  return t.plural(
    { one: "format.daysAgo.one", other: "format.daysAgo.other" },
    days,
  );
}
