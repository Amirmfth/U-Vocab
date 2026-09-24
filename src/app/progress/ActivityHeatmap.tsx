import Link from "next/link";
import type { ActivityDay } from "@/lib/progress";

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
}: {
  days: ActivityDay[];
  today: string;
  selectedDay?: string;
  range: string;
}) {
  const lookup = new Map(days.map((day) => [day.date, day]));
  const keys: string[] = [];
  let key = today;

  for (let index = 0; index < 365; index += 1) {
    keys.push(key);
    key = previousDateKey(key);
  }
  keys.reverse();

  return (
    <div className="heatmap-scroll">
      <div className="activity-heatmap" aria-label="365 days of vocabulary activity">
        {keys.map((date) => {
          const day = lookup.get(date);
          const count = day
            ? day.reviewed + day.learned + day.produced + day.encounters + day.mistakesCorrected
            : 0;

          return (
            <Link
              key={date}
              href={"/progress?range=" + range + "&day=" + date}
              className={
                "heatmap-cell heatmap-level-" +
                intensity(day) +
                (selectedDay === date ? " is-selected" : "")
              }
              aria-label={date + ": " + count + " learning activities"}
              title={date + " · " + count + " activities"}
            />
          );
        })}
      </div>
    </div>
  );
}
