"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TranslationLanguage } from "@prisma/client";
import { setTranslationMode } from "@/app/preferences/actions";

export function TranslationModeControl({
  value,
}: {
  value: TranslationLanguage;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  return (
    <div className="translation-switch-wrap [display:inline-flex] [flex-direction:column] [gap:3px] [align-items:flex-end]">
      <div className="translation-switch [display:inline-flex] [gap:3px] [padding:3px] [border:1px_solid_var(--border)] [border-radius:11px] [background:var(--surface)] [&_button]:[min-height:36px] [&_button]:[padding:0_10px] [&_button]:[border:0] [&_button]:[border-radius:8px] [&_button]:[background:transparent] [&_button]:[color:var(--text-muted)] [&_button]:[cursor:pointer] [&_button]:[font-size:0.72rem] [&_button]:[font-weight:650] [&_button.is-active]:[background:var(--surface-soft)] [&_button.is-active]:[color:var(--text)] [&_button:disabled]:[cursor:wait] [&_button:disabled]:[opacity:0.65]" aria-label="Translation language">
        {([
          ["ENGLISH", "EN"],
          ["PERSIAN", "FA"],
          ["BOTH", "Both"],
        ] as const).map(([mode, label]) => (
          <button
            type="button"
            className={value === mode ? "is-active" : ""}
            disabled={pending}
            aria-pressed={value === mode}
            key={mode}
            onClick={() => {
              setStatus("idle");
              startTransition(async () => {
                try {
                  await setTranslationMode(mode);
                  setStatus("saved");
                  router.refresh();
                } catch {
                  setStatus("error");
                }
              });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <span
        className={"translation-switch-status [min-height:12px] [color:var(--text-muted)] [font-size:0.62rem] [line-height:1] [&.is-error]:[color:var(--danger)] " + (status === "error" ? "is-error" : "")}
        aria-live="polite"
      >
        {pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Failed" : ""}
      </span>
    </div>
  );
}
