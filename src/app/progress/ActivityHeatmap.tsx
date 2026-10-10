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
    <div className="heatmap-scroll w-full overflow-x-auto padding-3px-0-8px">
      <div className="activity-heatmap w-max grid grid-auto-flow-column grid-template-rows-repeat-7-11px grid-auto-columns-11px gap-0.75" aria-label={t(dayCount <= 7 ? "progress.heatmapAria7" : "progress.heatmapAria")}>
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
                "heatmap-cell heatmap-level w-2.75 h-2.75 rounded-exact-2px bg-uv-surface-soft outline-1px-solid-transparent transition-transform-120ms-ease-outline-color-120ms-ease in-heatmap-level-1:bg-uv-c7978809be5 in-heatmap-level-2:bg-uv-cdedb452cb4 in-heatmap-level-3:bg-uv-c45f6640f64 in-heatmap-level-4:bg-uv-primary-strong hover:outline-uv-text-soft hover:transform-scale-1p18 focus-visible:outline-uv-text-soft focus-visible:transform-scale-1p18 in-is-selected:outline-2px-solid-text in-is-selected:outline-offset-1px heatmap-level-" +
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
