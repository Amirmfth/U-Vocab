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
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">{t("errors.genericTitle")}</p>
        <h1>{t("errors.actionTitle")}</h1>
        <p className="page-description">{t("errors.savedSafe")}</p>
      </section>
      <StatusNotice tone="error">{t("errors.requestFailed")}</StatusNotice>
      <button className="button button-primary" type="button" onClick={reset}>
        <RefreshCw size={18} />
        {t("errors.tryAgain")}
      </button>
    </main>
  );
}
