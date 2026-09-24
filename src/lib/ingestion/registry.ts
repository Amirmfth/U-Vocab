import type { IngestionSourceType } from "./types";
import { csvAdapter } from "./csv";

export const ingestionAdapters = {
  CSV: csvAdapter,
} as const;

export const plannedAdapterTypes: IngestionSourceType[] = [
  "URL",
  "ANKI",
  "BROWSER_EXTENSION",
];

export function hasIngestionAdapter(
  type: IngestionSourceType,
): type is keyof typeof ingestionAdapters {
  return type in ingestionAdapters;
}
