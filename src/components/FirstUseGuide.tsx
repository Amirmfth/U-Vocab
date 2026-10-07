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
    <aside className="first-use-guide panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [gap:1rem] [align-items:start] [margin-bottom:1rem] max-[640px]:[grid-template-columns:auto_minmax(0,_1fr)] [border-radius:18px]" aria-labelledby={guideId + "-title"}>
      <div className="first-use-guide-icon [display:grid] [place-items:center] [width:38px] [height:38px] [border-radius:12px] [background:var(--surface-strong,_rgba(255,_255,_255,_0.08))]" aria-hidden="true">
        <Info size={20} />
      </div>
      <div className="first-use-guide-copy [display:grid] [gap:0.35rem] [&_p]:[margin:0] [&_p]:[color:var(--muted)] [&_ul]:[margin:0] [&_ul]:[color:var(--muted)] [&_ul]:[padding-inline-start:1.15rem]">
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
        className="button button-secondary first-use-guide-dismiss [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] max-[640px]:[grid-column:1_/_-1] max-[640px]:[width:100%] max-[640px]:[justify-content:center] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
