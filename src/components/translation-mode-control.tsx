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
    <div className="translation-switch-wrap">
      <div className="translation-switch" aria-label="Translation language">
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
        className={"translation-switch-status " + (status === "error" ? "is-error" : "")}
        aria-live="polite"
      >
        {pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Failed" : ""}
      </span>
    </div>
  );
}
