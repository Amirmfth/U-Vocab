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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("errors.genericTitle")}</p>
        <h1>{t("errors.actionTitle")}</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("errors.savedSafe")}</p>
      </section>
      <StatusNotice tone="error">{t("errors.requestFailed")}</StatusNotice>
      <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="button" onClick={reset}>
        <RefreshCw size={18} />
        {t("errors.tryAgain")}
      </button>
    </main>
  );
}
