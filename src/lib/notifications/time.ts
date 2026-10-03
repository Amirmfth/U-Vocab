export function isValidIanaTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function zonedDateMinute(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return {
    year,
    month,
    day,
    minuteOfDay: hour * 60 + minute,
    dateKey: [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-"),
  };
}

export function withinReminderWindow(input: {
  now: Date;
  timeZone: string;
  reminderMinuteOfDay: number;
  windowMinutes?: number;
}) {
  const local = zonedDateMinute(input.now, input.timeZone);
  const windowMinutes = Math.max(1, Math.min(input.windowMinutes ?? 20, 60));
  const delta = local.minuteOfDay - input.reminderMinuteOfDay;
  return {
    eligible: delta >= 0 && delta < windowMinutes,
    bucketKey: local.dateKey,
    localMinuteOfDay: local.minuteOfDay,
  };
}

export function minuteToTimeValue(minuteOfDay: number) {
  const safe = Math.max(0, Math.min(1439, Math.trunc(minuteOfDay)));
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

export function timeValueToMinute(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid reminder time.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Invalid reminder time.");
  return hour * 60 + minute;
}
