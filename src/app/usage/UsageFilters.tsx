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
    <section className="usage-filters [display:grid] [grid-template-columns:1fr] [gap:10px] [padding:14px] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)] [background:var(--surface)] [&_label]:[display:flex] [&_label]:[flex-direction:column] [&_label]:[gap:6px] [&_.button]:[align-self:end] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[620px]:[&_.button]:[grid-column:1_/_-1] min-[940px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))_auto] min-[940px]:[align-items:end] min-[940px]:[&_.button]:[grid-column:auto] min-[940px]:[&_.button]:[min-height:48px]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="usage-operation-trigger">Feature</label>
        <ActivitySelect
          defaultValue={current.operation}
          id="usage-operation"
          name="operation"
          onValueChange={(value) => setParam("operation", value)}
          options={[{ value: "", label: "All features" }, ...operations]}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
        <label htmlFor="usage-model-trigger">Model</label>
        <ActivitySelect
          defaultValue={current.model}
          id="usage-model"
          name="model"
          onValueChange={(value) => setParam("model", value)}
          options={[{ value: "", label: "All models" }, ...models]}
        />
      </div>

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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
        <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" onClick={() => router.push("/usage")} type="button">
          <X size={16} />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
