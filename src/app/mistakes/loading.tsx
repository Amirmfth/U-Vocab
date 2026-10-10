"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.recurringWeaknesses") })}>
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade" aria-hidden="true">
        <div className="skeleton loading-mistakes-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-85pct-390px h-12" />
        <div className="skeleton loading-mistakes-count rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-47.5 h-4" />
        <div className="skeleton loading-mistakes-refresh bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-53.75 h-11 rounded-uv-r0939007802" />
      </section>

      <section className="mistake-cluster-list flex flex-col gap-3" aria-hidden="true">
        <div className="loading-mistakes-heading flex flex-col gap-2">
          <div className="skeleton loading-mistakes-kicker rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-36.25 h-3" />
          <div className="skeleton loading-mistakes-subtitle rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-65pct-250px h-6.25" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <article className="panel mistake-cluster border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-4 rounded-uv-r6d27d54c6c" key={index}>
            <div className="mistake-cluster-head flex items-start justify-between gap-3.5 in-h2:margin-8px-0-0 in-h2:text-uv-f44eab8f17b in-h2:letter-spacing-0p025em in-h2:capitalize in-svg:text-uv-text-muted in-svg:flex-0-0-auto">
              <div className="loading-mistakes-heading flex flex-col gap-2">
                <div className="loading-mistakes-badges flex gap-1.75 in-skeleton:w-20 in-skeleton:h-6 in-skeleton:rounded-uv-r9bc5fefa1a in-skeleton-last-child:w-28.75">
                  <div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
                </div>
                <div className="skeleton loading-mistakes-cluster-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-65vw-270px h-6" />
              </div>
              <div className="skeleton loading-mistakes-icon rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-5 h-5" />
            </div>
            <div className="mistake-pattern-items flex flex-col border-1px-solid-border-3">
              {Array.from({ length: 2 }, (_, row) => (
                <div className="mistake-pattern-row flex flex-col gap-3 padding-14px-0 border-1px-solid-border uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-center" key={row}>
                  <div className="loading-mistakes-copy flex flex-col gap-2 in-skeleton:width-min-60vw-300px in-skeleton:h-4 in-skeleton-last-child:width-min-48vw-210px">
                    <div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
                    <div className="skeleton rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
                  </div>
                  <div className="skeleton loading-mistakes-resolve bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-9.5 rounded-uv-r933cc73310" />
                </div>
              ))}
            </div>
            <div className="skeleton loading-mistakes-practice bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-235px h-11 rounded-uv-r0939007802" />
          </article>
        ))}
      </section>
    </main>
  );
}
