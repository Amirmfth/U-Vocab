"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.recurringWeaknesses") })}>
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade" aria-hidden="true">
        <div className="skeleton loading-mistakes-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-7d7210f936 h-12" />
        <div className="skeleton loading-mistakes-count rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-47.5 h-4" />
        <div className="skeleton loading-mistakes-refresh uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-53.75 h-11 rounded-uv-r0939007802" />
      </section>

      <section className="mistake-cluster-list flex flex-col gap-3" aria-hidden="true">
        <div className="loading-mistakes-heading flex flex-col gap-2">
          <div className="skeleton loading-mistakes-kicker rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-36.25 h-3" />
          <div className="skeleton loading-mistakes-subtitle rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-17a64ec503 h-6.25" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <article className="panel mistake-cluster uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-4 rounded-uv-r6d27d54c6c" key={index}>
            <div className="mistake-cluster-head flex items-start justify-between gap-3.5 uv-vd552c26874:uv-margin-86ddfb81a1 uv-vd552c26874:text-uv-f44eab8f17b uv-vd552c26874:uv-letter-spacing-8b899f0f19 uv-vd552c26874:capitalize uv-v872d6ea02a:text-uv-text-muted uv-v872d6ea02a:uv-flex-18ba0b6e31">
              <div className="loading-mistakes-heading flex flex-col gap-2">
                <div className="loading-mistakes-badges flex gap-1.75 uv-v56f1a99c32:w-20 uv-v56f1a99c32:h-6 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-v729ebd4b93:w-28.75">
                  <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
                </div>
                <div className="skeleton loading-mistakes-cluster-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-6c305f67cd h-6" />
              </div>
              <div className="skeleton loading-mistakes-icon rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-5 h-5" />
            </div>
            <div className="mistake-pattern-items flex flex-col uv-border-top-8d7f82f403">
              {Array.from({ length: 2 }, (_, row) => (
                <div className="mistake-pattern-row flex flex-col gap-3 uv-padding-612d1e1532 uv-border-bottom-8d7f82f403 uv-min620:grid uv-min620:uv-grid-template-columns-f06dd92ea5 uv-min620:items-center" key={row}>
                  <div className="loading-mistakes-copy flex flex-col gap-2 uv-v56f1a99c32:uv-width-71a8586107 uv-v56f1a99c32:h-4 uv-v729ebd4b93:uv-width-fe93497e42">
                    <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
                    <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
                  </div>
                  <div className="skeleton loading-mistakes-resolve uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-9.5 rounded-uv-r933cc73310" />
                </div>
              ))}
            </div>
            <div className="skeleton loading-mistakes-practice uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-1875ed0470 h-11 rounded-uv-r0939007802" />
          </article>
        ))}
      </section>
    </main>
  );
}
