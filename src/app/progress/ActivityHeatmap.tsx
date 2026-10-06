import Link from "next/link";
import type { ActivityDay } from "@/lib/progress";
import type { UiLocale } from "@/i18n/config";
import { createTranslator } from "@/i18n/core";
import { formatDate, formatNumber } from "@/i18n/format";

function previousDateKey(key: string) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function intensity(day: ActivityDay | undefined) {
  if (!day) return 0;
  const total =
    day.reviewed +
    day.learned +
    day.produced +
    day.readingEncounters +
    day.mistakesCorrected;
  if (total === 0) return 0;
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 10) return 3;
  return 4;
}

export function ActivityHeatmap({
  days,
  today,
  selectedDay,
  range,
  locale,
  dayCount = 365,
}: {
  days: ActivityDay[];
  today: string;
  selectedDay?: string;
  range: string;
  locale: UiLocale;
  dayCount?: number;
}) {
  const t = createTranslator(locale);
  const lookup = new Map(days.map((day) => [day.date, day]));
  const keys: string[] = [];
  let key = today;

  for (let index = 0; index < dayCount; index += 1) {
    keys.push(key);
    key = previousDateKey(key);
  }
  keys.reverse();

  return (
    <div className="heatmap-scroll">
      <div className="activity-heatmap" aria-label={t(dayCount <= 7 ? "progress.heatmapAria7" : "progress.heatmapAria")}>
        {keys.map((date) => {
          const day = lookup.get(date);
          const count = day
            ? day.reviewed +
              day.learned +
              day.produced +
              day.readingEncounters +
              day.mistakesCorrected
            : 0;
          const formattedDate = formatDate(
            locale,
            new Date(date + "T12:00:00Z"),
            { dateStyle: "medium" },
          );
          const formattedCount = formatNumber(locale, count);

          return (
            <Link
              key={date}
              href={"/progress?range=" + range + "&day=" + date}
              className={
                "heatmap-cell heatmap-level-" +
                intensity(day) +
                (selectedDay === date ? " is-selected" : "")
              }
              aria-label={t("progress.activities", {
                date: formattedDate,
                count: formattedCount,
              })}
              title={t("progress.activitiesTitle", {
                date: formattedDate,
                count: formattedCount,
              })}
            />
          );
        })}
      </div>
    </div>
  );
}
