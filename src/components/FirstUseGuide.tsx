"use client";

import { useEffect, useState, useTransition } from "react";
import { Info, X } from "lucide-react";
import { dismissGuide, markGuideSeen } from "./first-use-guide-actions";

export function FirstUseGuide({
  guideId,
  version,
  title,
  description,
  items = [],
  dismissLabel,
}: {
  guideId: string;
  version: number;
  title: string;
  description: string;
  items?: string[];
  dismissLabel: string;
}) {
  const [visible, setVisible] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void markGuideSeen(guideId, version);
  }, [guideId, version]);

  if (!visible) return null;

  return (
    <aside className="first-use-guide panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid grid-template-columns-auto-minmax-0-1fr-auto gap-1rem items-start margin-bottom-1rem uv-max640:grid-template-columns-auto-minmax-0-1fr-2 rounded-uv-r6d27d54c6c" aria-labelledby={guideId + "-title"}>
      <div className="first-use-guide-icon grid place-items-center w-9.5 h-9.5 rounded-uv-r0939007802 bg-uv-c687589579d" aria-hidden="true">
        <Info size={20} />
      </div>
      <div className="first-use-guide-copy grid gap-0p35rem in-p-2:m-0 in-p-2:text-uv-c7dbd63a13e in-ul:m-0 in-ul:text-uv-c7dbd63a13e in-ul:padding-inline-start-1p15rem">
        <strong id={guideId + "-title"}>{title}</strong>
        <p>{description}</p>
        {items.length ? (
          <ul>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="button button-secondary first-use-guide-dismiss w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto uv-max640:grid-column-1-1 uv-max640:w-full uv-max640:justify-center in-button-danger:border-current min-height-tap-target"
        disabled={pending}
        onClick={() => {
          setVisible(false);
          startTransition(() => {
            void dismissGuide(guideId, version);
          });
        }}
      >
        <X size={17} />
        {dismissLabel}
      </button>
    </aside>
  );
}
