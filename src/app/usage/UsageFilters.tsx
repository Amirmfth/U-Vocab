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
    <section className="usage-filters">
      <div className="field">
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

      <div className="field">
        <label htmlFor="usage-operation-trigger">Feature</label>
        <ActivitySelect
          defaultValue={current.operation}
          id="usage-operation"
          name="operation"
          onValueChange={(value) => setParam("operation", value)}
          options={[{ value: "", label: "All features" }, ...operations]}
        />
      </div>

      <div className="field">
        <label htmlFor="usage-model-trigger">Model</label>
        <ActivitySelect
          defaultValue={current.model}
          id="usage-model"
          name="model"
          onValueChange={(value) => setParam("model", value)}
          options={[{ value: "", label: "All models" }, ...models]}
        />
      </div>

      <div className="field">
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
        <button className="button button-secondary" onClick={() => router.push("/usage")} type="button">
          <X size={16} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
