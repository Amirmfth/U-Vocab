"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActivitySelect, type ActivitySelectOption } from "@/components/ui/activity-select";

type UsageFilterKey = "period" | "operation" | "model" | "status";

export function UsageFilters({
  current,
  operations,
  models,
}: {
  current: Record<UsageFilterKey, string>;
  operations: ActivitySelectOption[];
  models: ActivitySelectOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: UsageFilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = (key === "period" && value === "30") ||
      (key !== "period" && !value);

    if (isDefault) params.delete(key);
    else params.set(key, value);

    router.push("/usage" + (params.toString() ? "?" + params.toString() : ""));
  }

  const hasCustomFilters =
    current.period !== "30" || Boolean(current.operation || current.model || current.status);

  return (
    <section className="usage-filters grid grid-template-columns-1fr gap-2.5 p-3.5 border-1px-solid-border-2 rounded-uv-r02a0a889dd bg-uv-surface in-label:flex in-label:flex-col in-label:gap-1.5 in-button-2:self-end uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min620:in-button-2:grid-column-1-1 uv-min940:grid-template-columns-repeat-4-minmax-0-1fr-auto uv-min940:items-end uv-min940:in-button-2:grid-column-auto uv-min940:in-button-2:min-h-12">
      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <label htmlFor="usage-period-trigger">Period</label>
        <ActivitySelect
          defaultValue={current.period}
          id="usage-period"
          name="period"
          onValueChange={(value) => setParam("period", value)}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "all", label: "All time" },
          ]}
        />
      </div>

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <label htmlFor="usage-operation-trigger">Feature</label>
        <ActivitySelect
          defaultValue={current.operation}
          id="usage-operation"
          name="operation"
          onValueChange={(value) => setParam("operation", value)}
          options={[{ value: "", label: "All features" }, ...operations]}
        />
      </div>

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <label htmlFor="usage-model-trigger">Model</label>
        <ActivitySelect
          defaultValue={current.model}
          id="usage-model"
          name="model"
          onValueChange={(value) => setParam("model", value)}
          options={[{ value: "", label: "All models" }, ...models]}
        />
      </div>

      <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
        <label htmlFor="usage-status-trigger">Status</label>
        <ActivitySelect
          defaultValue={current.status}
          id="usage-status"
          name="status"
          onValueChange={(value) => setParam("status", value)}
          options={[
            { value: "", label: "All statuses" },
            { value: "SUCCESS", label: "Success" },
            { value: "ERROR", label: "Error" },
          ]}
        />
      </div>

      {hasCustomFilters ? (
        <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" onClick={() => router.push("/usage")} type="button">
          <X size={16} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
