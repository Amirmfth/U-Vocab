"use client";

import { useTransition } from "react";
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

  return (
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
            startTransition(async () => {
              await setTranslationMode(mode);
              router.refresh();
            });
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
