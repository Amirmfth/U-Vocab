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
        className="activity-select-trigger w-full min-h-12 flex items-center gap-3 padding-11px-13px-11px-14px border-1px-solid-border-2 rounded-exact-14px bg-uv-cdae29b0797 text-uv-text cursor-pointer text-left transition-border-color-180ms-ease-box-shadow-180ms-ease-backgr hover:border-uv-border-strong hover:bg-uv-cfcbfb23a40 focus-visible:outline-none focus-visible:border-uv-primary focus-visible:box-shadow-0-0-0-3px-rgb-139-124-255-0p12 disabled:opacity-0p58 disabled:cursor-not-allowed in-svg-2:flex-0-0-auto in-svg-2:text-uv-text-muted in-svg-2:transform-rotate-180deg in-svg-2:transition-transform-280ms-cubic-bezier-0p4-0-0p2-1-color-180ms in-svg-is-open:text-uv-primary-strong in-svg-is-open:transform-rotate-0deg"
        disabled={disabled}
        id={id + "-trigger"}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="activity-select-copy min-w-0 flex flex-1 flex-col gap-0.5">
          <span className="activity-select-value text-exact-0p9rem font-semibold line-height-1p25">{selected.label}</span>
          {selected.description ? (
            <span className="activity-select-description text-uv-text-muted text-exact-0p72rem line-height-1p35">{selected.description}</span>
          ) : null}
        </span>
        <ChevronUp aria-hidden="true" className={isOpen ? "is-open" : ""} size={19} />
      </button>

      <div className={isOpen ? "activity-select-menu is-open grid grid-template-rows-0fr opacity-0 transition-grid-template-rows-260ms-cubic-bezier-0p4-0-0p2-1-op in-is-open:grid-template-rows-1fr in-is-open:opacity-100" : "activity-select-menu grid grid-template-rows-0fr opacity-0 transition-grid-template-rows-260ms-cubic-bezier-0p4-0-0p2-1-op in-is-open:grid-template-rows-1fr in-is-open:opacity-100"}>
        <div className="activity-select-menu-inner relative z-index-20 min-h-0 overflow-hidden in-div:max-height-min-280px-42dvh in-div:flex in-div:flex-col in-div:gap-0.75 in-div:mt-1.75 in-div:overflow-y-auto in-div:p-1.25 in-div:border-1px-solid-border-2 in-div:rounded-exact-16px in-div:bg-uv-surface-raised in-div:box-shadow-shadow">
          <div aria-label={t("common.options")} id={listboxId} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "activity-select-option is-selected w-full min-h-11.5 flex items-center gap-2.5 padding-10px-11px border-0 rounded-exact-11px bg-transparent text-uv-text-soft cursor-pointer text-left transition-background-160ms-ease-color-160ms-ease-transform-160 hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text active:transform-scale-0p985 in-is-selected:bg-uv-cbdfd7cd038 in-is-selected:text-uv-text" : "activity-select-option w-full min-h-11.5 flex items-center gap-2.5 padding-10px-11px border-0 rounded-exact-11px bg-transparent text-uv-text-soft cursor-pointer text-left transition-background-160ms-ease-color-160ms-ease-transform-160 hover:outline-none hover:bg-uv-surface-soft hover:text-uv-text focus-visible:outline-none focus-visible:bg-uv-surface-soft focus-visible:text-uv-text active:transform-scale-0p985 in-is-selected:bg-uv-cbdfd7cd038 in-is-selected:text-uv-text"}
                  key={option.value}
                  onClick={() => {
                    setValue(option.value);
                    onValueChange?.(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="activity-select-option-copy min-w-0 flex flex-1 flex-col gap-0.5 in-span-2:text-exact-0p9rem in-span-2:font-semibold in-span-2:line-height-1p25 in-small:text-uv-text-muted in-small:text-exact-0p72rem in-small:line-height-1p35">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <span className="activity-select-check flex-0-0-auto text-uv-primary-strong font-font-geist-mono-geist-mono-monospace text-exact-0p66rem">{t("common.selected")}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
