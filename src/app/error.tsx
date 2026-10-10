"use client";

import { RefreshCw } from "lucide-react";
import { StatusNotice } from "@/components/status-notice";
import { useTranslations } from "@/i18n/client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("errors.genericTitle")}</p>
        <h1>{t("errors.actionTitle")}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">{t("errors.savedSafe")}</p>
      </section>
      <StatusNotice tone="error">{t("errors.requestFailed")}</StatusNotice>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" onClick={reset}>
        <RefreshCw size={18} />
        {t("errors.tryAgain")}
      </button>
    </main>
  );
}
