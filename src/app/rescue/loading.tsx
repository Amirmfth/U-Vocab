"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.rescueWords") })}>
      <section className="page-header compact rescue-loading-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade" aria-hidden="true">
        <div className="skeleton loading-rescue-back rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-19.5 h-5" />
        <div className="skeleton loading-rescue-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-a305a50d4a h-12" />
      </section>

      <section className="rescue-list flex flex-col uv-border-top-8d7f82f403" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="rescue-row grid uv-grid-template-columns-738a8da05d gap-3 items-start uv-padding-612d1e1532 uv-border-bottom-8d7f82f403 uv-min620:items-center" key={index}>
            <div className="skeleton loading-rescue-rank rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-5 h-3.5 mt-0.75" />
            <div className="rescue-row-copy min-w-0 flex flex-col gap-2 uv-v0fee2d502c:flex uv-v0fee2d502c:flex-col uv-v0fee2d502c:gap-0.75 uv-v1c155e3be2:text-uv-text-muted uv-v1c155e3be2:text-uv-ff1713651e0">
              <div className="skeleton loading-rescue-word rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-b523d09d0b h-5" />
              <div className="skeleton loading-rescue-retrievability rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-31.25 h-3.25" />
              <div className="skeleton loading-rescue-reason uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-7c9711e33c h-5.5 rounded-uv-r9bc5fefa1a" />
            </div>
            <div className="skeleton loading-rescue-score rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-7.5 h-4.5" />
          </div>
        ))}
      </section>

      <div className="progress-actions flex flex-col gap-2.25 uv-min620:flex-row" aria-hidden="true">
        <div className="skeleton loading-rescue-action uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-4749f62965 h-11 rounded-uv-r0939007802 uv-v9604db95d4:uv-width-c6d84a4ebe" />
        <div className="skeleton loading-rescue-action secondary border-uv-border text-uv-text uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-4749f62965 h-11 rounded-uv-r0939007802 uv-v9604db95d4:uv-width-c6d84a4ebe" />
      </div>
    </main>
  );
}
