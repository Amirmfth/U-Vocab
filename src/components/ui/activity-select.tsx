"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@/i18n/client";

export type ActivitySelectOption = {
  label: string;
  value: string;
  description?: string;
};

type ActivitySelectProps = {
  id: string;
  name: string;
  defaultValue: string;
  options: ActivitySelectOption[];
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export function ActivitySelect({
  id,
  name,
  defaultValue,
  options,
  disabled = false,
  onValueChange,
}: ActivitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];
  const t = useTranslations();

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="activity-select relative w-full" ref={rootRef}>
      <input type="hidden" id={id} name={name} value={selected.value} />
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="activity-select-trigger w-full min-h-12 flex items-center gap-3 uv-padding-2ec9052789 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-cdae29b0797 text-uv-text cursor-pointer text-left uv-transition-3ef91150eb hover:border-uv-border-strong hover:bg-uv-cfcbfb23a40 focus-visible:outline-none focus-visible:border-uv-primary focus-visible:uv-box-shadow-d49874f3e7 disabled:uv-opacity-8ecc5701b7 disabled:cursor-not-allowed uv-vf69988b1be:uv-flex-18ba0b6e31 uv-vf69988b1be:text-uv-text-muted uv-vf69988b1be:uv-transform-14214c0e93 uv-vf69988b1be:uv-transition-9d520833e8 uv-vf73fcca4c0:text-uv-primary-strong uv-vf73fcca4c0:uv-transform-595c37b5a2"
        disabled={disabled}
        id={id + "-trigger"}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="activity-select-copy min-w-0 flex uv-flex-356a192b79 flex-col gap-0.5">
          <span className="activity-select-value text-uv-fee84419642 font-semibold uv-line-height-8e007eaa50">{selected.label}</span>
          {selected.description ? (
            <span className="activity-select-description text-uv-text-muted text-uv-ff1713651e0 uv-line-height-ec0a69ff34">{selected.description}</span>
          ) : null}
        </span>
        <ChevronUp aria-hidden="true" className={isOpen ? "is-open" : ""} size={19} />
      </button>

      <div className={isOpen ? "activity-select-menu is-open grid uv-grid-template-rows-b2586e2789 opacity-0 uv-transition-8d4ddab00a uv-ve7ef4d7544:uv-grid-template-rows-6a5c4d4d49 uv-ve7ef4d7544:opacity-100" : "activity-select-menu grid uv-grid-template-rows-b2586e2789 opacity-0 uv-transition-8d4ddab00a uv-ve7ef4d7544:uv-grid-template-rows-6a5c4d4d49 uv-ve7ef4d7544:opacity-100"}>
        <div className="activity-select-menu-inner relative uv-z-index-91032ad7bb min-h-0 overflow-hidden uv-vcbb57f4d35:uv-max-height-8aa6583a40 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:mt-1.75 uv-vcbb57f4d35:overflow-y-auto uv-vcbb57f4d35:p-1.25 uv-vcbb57f4d35:uv-border-8d7f82f403 uv-vcbb57f4d35:rounded-uv-r4678bd4d8a uv-vcbb57f4d35:bg-uv-surface-raised uv-vcbb57f4d35:uv-box-shadow-4ee177db8b">
          <div aria-label={t("common.options")} id={listboxId} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "activity-select-option is-selected w-full min-h-11.5 flex items-center gap-2.5 uv-padding-3cf03e44f1 border-0 rounded-uv-r4bd46d4017 bg-transparent text-uv-text-soft cursor-pointer text-left uv-transition-684a940bdf hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text active:uv-transform-bcd93e0f45 uv-v48f8f87023:bg-uv-cbdfd7cd038 uv-v48f8f87023:text-uv-text" : "activity-select-option w-full min-h-11.5 flex items-center gap-2.5 uv-padding-3cf03e44f1 border-0 rounded-uv-r4bd46d4017 bg-transparent text-uv-text-soft cursor-pointer text-left uv-transition-684a940bdf hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text active:uv-transform-bcd93e0f45 uv-v48f8f87023:bg-uv-cbdfd7cd038 uv-v48f8f87023:text-uv-text"}
                  key={option.value}
                  onClick={() => {
                    setValue(option.value);
                    onValueChange?.(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="activity-select-option-copy min-w-0 flex uv-flex-356a192b79 flex-col gap-0.5 uv-v22810335d8:text-uv-fee84419642 uv-v22810335d8:font-semibold uv-v22810335d8:uv-line-height-8e007eaa50 uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff1713651e0 uv-v982220ddd5:uv-line-height-ec0a69ff34">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <span className="activity-select-check uv-flex-18ba0b6e31 text-uv-primary-strong uv-font-family-320794573f text-uv-ff7862da171">{t("common.selected")}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
