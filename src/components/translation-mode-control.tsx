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
      <div className="translation-switch inline-flex gap-0.75 p-0.75 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 bg-uv-surface uv-v513a7112a0:min-h-9 uv-v513a7112a0:uv-padding-4d5c65a39c uv-v513a7112a0:border-0 uv-v513a7112a0:rounded-uv-r9bc5fefa1a uv-v513a7112a0:bg-transparent uv-v513a7112a0:text-uv-text-muted uv-v513a7112a0:cursor-pointer uv-v513a7112a0:text-uv-ff1713651e0 uv-v513a7112a0:uv-weight-650 uv-v169acfe1bb:bg-uv-surface-soft uv-v169acfe1bb:text-uv-text uv-v2497b722ae:cursor-wait uv-v2497b722ae:opacity-65" aria-label="Translation language">
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
        className={"translation-switch-status min-h-3 text-uv-text-muted text-uv-f174ef476a0 uv-line-height-356a192b79 uv-vfd5e162739:text-uv-danger " + (status === "error" ? "is-error" : "")}
        aria-live="polite"
      >
        {pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Failed" : ""}
      </span>
    </div>
  );
}
