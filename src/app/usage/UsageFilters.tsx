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
    <section className="usage-filters grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 p-3.5 uv-border-8d7f82f403 rounded-uv-r02a0a889dd bg-uv-surface uv-v586b3820a5:flex uv-v586b3820a5:flex-col uv-v586b3820a5:gap-1.5 uv-vcded88c612:self-end uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vcded88c612:uv-grid-column-93b665dfb5 uv-min940:uv-grid-template-columns-aab312fc67 uv-min940:items-end uv-min940:uv-vcded88c612:uv-grid-column-0d612c12d2 uv-min940:uv-vcded88c612:min-h-12">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
        <label htmlFor="usage-operation-trigger">Feature</label>
        <ActivitySelect
          defaultValue={current.operation}
          id="usage-operation"
          name="operation"
          onValueChange={(value) => setParam("operation", value)}
          options={[{ value: "", label: "All features" }, ...operations]}
        />
      </div>

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
        <label htmlFor="usage-model-trigger">Model</label>
        <ActivitySelect
          defaultValue={current.model}
          id="usage-model"
          name="model"
          onValueChange={(value) => setParam("model", value)}
          options={[{ value: "", label: "All models" }, ...models]}
        />
      </div>

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
        <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" onClick={() => router.push("/usage")} type="button">
          <X size={16} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
