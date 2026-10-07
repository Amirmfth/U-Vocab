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
    <div className="activity-select [position:relative] [width:100%]" ref={rootRef}>
      <input type="hidden" id={id} name={name} value={selected.value} />
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="activity-select-trigger [width:100%] [min-height:48px] [display:flex] [align-items:center] [gap:12px] [padding:11px_13px_11px_14px] [border:1px_solid_var(--border)] [border-radius:14px] [background:#0d0d10] [color:var(--text)] [cursor:pointer] [text-align:left] [transition:border-color_180ms_ease,_box-shadow_180ms_ease,_background_180ms_ease] [&:hover]:[border-color:var(--border-strong)] [&:hover]:[background:#101014] [&:focus-visible]:[outline:none] [&:focus-visible]:[border-color:var(--primary)] [&:focus-visible]:[box-shadow:0_0_0_3px_rgba(139,_124,_255,_0.12)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:not-allowed] [&_svg]:[flex:0_0_auto] [&_svg]:[color:var(--text-muted)] [&_svg]:[transform:rotate(180deg)] [&_svg]:[transition:transform_280ms_cubic-bezier(0.4,_0,_0.2,_1),_color_180ms_ease] [&_svg.is-open]:[color:var(--primary-strong)] [&_svg.is-open]:[transform:rotate(0deg)]"
        disabled={disabled}
        id={id + "-trigger"}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="activity-select-copy [min-width:0] [display:flex] [flex:1] [flex-direction:column] [gap:2px]">
          <span className="activity-select-value [font-size:0.9rem] [font-weight:600] [line-height:1.25]">{selected.label}</span>
          {selected.description ? (
            <span className="activity-select-description [color:var(--text-muted)] [font-size:0.72rem] [line-height:1.35]">{selected.description}</span>
          ) : null}
        </span>
        <ChevronUp aria-hidden="true" className={isOpen ? "is-open" : ""} size={19} />
      </button>

      <div className={isOpen ? "activity-select-menu is-open [display:grid] [grid-template-rows:0fr] [opacity:0] [transition:grid-template-rows_260ms_cubic-bezier(0.4,_0,_0.2,_1),_opacity_180ms_ease] [&.is-open]:[grid-template-rows:1fr] [&.is-open]:[opacity:1]" : "activity-select-menu [display:grid] [grid-template-rows:0fr] [opacity:0] [transition:grid-template-rows_260ms_cubic-bezier(0.4,_0,_0.2,_1),_opacity_180ms_ease] [&.is-open]:[grid-template-rows:1fr] [&.is-open]:[opacity:1]"}>
        <div className="activity-select-menu-inner [position:relative] [z-index:20] [min-height:0] [overflow:hidden] [&_>_div]:[max-height:min(280px,_42dvh)] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:3px] [&_>_div]:[margin-top:7px] [&_>_div]:[overflow-y:auto] [&_>_div]:[padding:5px] [&_>_div]:[border:1px_solid_var(--border)] [&_>_div]:[border-radius:16px] [&_>_div]:[background:var(--surface-raised)] [&_>_div]:[box-shadow:var(--shadow)]">
          <div aria-label={t("common.options")} id={listboxId} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "activity-select-option is-selected [width:100%] [min-height:46px] [display:flex] [align-items:center] [gap:10px] [padding:10px_11px] [border:0] [border-radius:11px] [background:transparent] [color:var(--text-soft)] [cursor:pointer] [text-align:left] [transition:background_160ms_ease,_color_160ms_ease,_transform_160ms_ease] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)] [&:active]:[transform:scale(0.985)] [&.is-selected]:[background:var(--primary-soft)] [&.is-selected]:[color:var(--text)]" : "activity-select-option [width:100%] [min-height:46px] [display:flex] [align-items:center] [gap:10px] [padding:10px_11px] [border:0] [border-radius:11px] [background:transparent] [color:var(--text-soft)] [cursor:pointer] [text-align:left] [transition:background_160ms_ease,_color_160ms_ease,_transform_160ms_ease] [&:hover]:[outline:none] [&:hover]:[background:var(--surface-soft)] [&:hover]:[color:var(--text)] [&:focus-visible]:[outline:none] [&:focus-visible]:[background:var(--surface-soft)] [&:focus-visible]:[color:var(--text)] [&:active]:[transform:scale(0.985)] [&.is-selected]:[background:var(--primary-soft)] [&.is-selected]:[color:var(--text)]"}
                  key={option.value}
                  onClick={() => {
                    setValue(option.value);
                    onValueChange?.(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="activity-select-option-copy [min-width:0] [display:flex] [flex:1] [flex-direction:column] [gap:2px] [&_>_span]:[font-size:0.9rem] [&_>_span]:[font-weight:600] [&_>_span]:[line-height:1.25] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.72rem] [&_small]:[line-height:1.35]">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <span className="activity-select-check [flex:0_0_auto] [color:var(--primary-strong)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.66rem]">{t("common.selected")}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
