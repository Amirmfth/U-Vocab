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
    <div className="heatmap-scroll w-full overflow-x-auto uv-padding-fe30849572">
      <div className="activity-heatmap w-max grid uv-grid-auto-flow-aa60230ab0 uv-grid-template-rows-aab036a98e uv-grid-auto-columns-4bd46d4017 gap-0.75" aria-label={t(dayCount <= 7 ? "progress.heatmapAria7" : "progress.heatmapAria")}>
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
                "heatmap-cell heatmap-level w-2.75 h-2.75 rounded-uv-ra0179b92f3 bg-uv-surface-soft uv-outline-bdc43f584d uv-transition-1b8e537267 uv-vaa682ffe01:bg-uv-c7978809be5 uv-vd2d630e022:bg-uv-cdedb452cb4 uv-v4492fe04fe:bg-uv-c45f6640f64 uv-v86dd054dc8:bg-uv-primary-strong hover:outline-uv-text-soft hover:uv-transform-1906d1542a focus-visible:outline-uv-text-soft focus-visible:uv-transform-1906d1542a uv-v48f8f87023:uv-outline-edcab5d466 uv-v48f8f87023:uv-outline-offset-9e0741c052 heatmap-level-" +
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
