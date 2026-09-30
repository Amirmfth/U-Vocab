import type { QuotaPeriod } from "./config";

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function offsetAt(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - date.getTime();
}

function localDateTimeToUtc(
  timeZone: string,
  input: { year: number; month: number; day: number; hour?: number },
) {
  const naive = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour ?? 0, 0, 0),
  );
  let candidate = new Date(naive.getTime() - offsetAt(naive, timeZone));
  candidate = new Date(naive.getTime() - offsetAt(candidate, timeZone));
  return candidate;
}

export function quotaPeriodFor(
  now: Date,
  timeZone: string,
  period: QuotaPeriod,
) {
  const local = zonedParts(now, timeZone);

  if (period === "DAY") {
    const start = localDateTimeToUtc(timeZone, {
      year: local.year,
      month: local.month,
      day: local.day,
    });
    const tomorrow = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
    const next = {
      year: tomorrow.getUTCFullYear(),
      month: tomorrow.getUTCMonth() + 1,
      day: tomorrow.getUTCDate(),
    };
    const end = localDateTimeToUtc(timeZone, next);
    const periodKey = [
      local.year,
      String(local.month).padStart(2, "0"),
      String(local.day).padStart(2, "0"),
    ].join("-");
    return { periodKey, start, end };
  }

  const start = localDateTimeToUtc(timeZone, {
    year: local.year,
    month: local.month,
    day: 1,
  });
  const nextMonth = new Date(Date.UTC(local.year, local.month, 1));
  const end = localDateTimeToUtc(timeZone, {
    year: nextMonth.getUTCFullYear(),
    month: nextMonth.getUTCMonth() + 1,
    day: 1,
  });
  return {
    periodKey: local.year + "-" + String(local.month).padStart(2, "0"),
    start,
    end,
  };
}
