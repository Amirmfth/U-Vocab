"use client";

import { RefreshCw } from "lucide-react";
import { StatusNotice } from "@/components/status-notice";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>That action did not finish.</h1>
        <p className="page-description">
          Your saved vocabulary is untouched. Retry the current screen.
        </p>
      </section>
      <StatusNotice tone="error">
        The request failed before U-Vocab could finish the operation.
      </StatusNotice>
      <button className="button button-primary" type="button" onClick={reset}>
        <RefreshCw size={18} />
        Retry
      </button>
    </main>
  );
}
