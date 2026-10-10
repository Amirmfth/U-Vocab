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
    <div className="translation-switch-wrap inline-flex flex-col gap-0.75 items-end">
      <div className="translation-switch inline-flex gap-0.75 p-0.75 border-1px-solid-border-2 rounded-exact-11px bg-uv-surface in-button-3:min-h-9 in-button-3:padding-0-10px in-button-3:border-0 in-button-3:rounded-exact-8px in-button-3:bg-transparent in-button-3:text-uv-text-muted in-button-3:cursor-pointer in-button-3:text-exact-0p72rem in-button-3:font-650 in-button-is-active:bg-uv-surface-soft in-button-is-active:text-uv-text in-button-disabled-2:cursor-wait in-button-disabled-2:opacity-65" aria-label="Translation language">
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
        className={"translation-switch-status min-h-3 text-uv-text-muted text-exact-0p62rem line-height-1 in-is-error:text-uv-danger " + (status === "error" ? "is-error" : "")}
        aria-live="polite"
      >
        {pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Failed" : ""}
      </span>
    </div>
  );
}
