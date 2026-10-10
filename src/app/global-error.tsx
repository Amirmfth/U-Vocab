"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
          <section className="panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c">
            <h1>Something went wrong</h1>
            <p>An unexpected application error occurred.</p>
            <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" onClick={reset}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
