"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
};

export function ActivitySelect({
  id,
  name,
  defaultValue,
  options,
  disabled = false,
}: ActivitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

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
    <div className="activity-select" ref={rootRef}>
      <input type="hidden" id={id} name={name} value={selected.value} />
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="activity-select-trigger"
        disabled={disabled}
        id={id + "-trigger"}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="activity-select-copy">
          <span className="activity-select-value">{selected.label}</span>
          {selected.description ? (
            <span className="activity-select-description">{selected.description}</span>
          ) : null}
        </span>
        <ChevronUp aria-hidden="true" className={isOpen ? "is-open" : ""} size={19} />
      </button>

      <div className={isOpen ? "activity-select-menu is-open" : "activity-select-menu"}>
        <div className="activity-select-menu-inner">
          <div aria-label="Options" id={listboxId} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === selected.value;
              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "activity-select-option is-selected" : "activity-select-option"}
                  key={option.value}
                  onClick={() => {
                    setValue(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="activity-select-option-copy">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <span className="activity-select-check">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
