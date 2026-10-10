"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.rescueWords") })}>
      <section className="page-header compact rescue-loading-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade" aria-hidden="true">
        <div className="skeleton loading-rescue-back rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-19.5 h-5" />
        <div className="skeleton loading-rescue-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-75pct-310px h-12" />
      </section>

      <section className="rescue-list flex flex-col border-1px-solid-border-3" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="rescue-row grid grid-template-columns-auto-minmax-0-1fr-auto gap-3 items-start padding-14px-0 border-1px-solid-border uv-min620:items-center" key={index}>
            <div className="skeleton loading-rescue-rank rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-5 h-3.5 mt-0.75" />
            <div className="rescue-row-copy min-w-0 flex flex-col gap-2 in-div-first-child:flex in-div-first-child:flex-col in-div-first-child:gap-0.75 in-div-first-child-span:text-uv-text-muted in-div-first-child-span:text-uv-ff1713651e0">
              <div className="skeleton loading-rescue-word rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-55vw-220px h-5" />
              <div className="skeleton loading-rescue-retrievability rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-31.25 h-3.25" />
              <div className="skeleton loading-rescue-reason bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-65vw-260px h-5.5 rounded-uv-r9bc5fefa1a" />
            </div>
            <div className="skeleton loading-rescue-score rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-7.5 h-4.5" />
          </div>
        ))}
      </section>

      <div className="progress-actions flex flex-col gap-2.25 uv-min620:flex-row" aria-hidden="true">
        <div className="skeleton loading-rescue-action bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-210px h-11 rounded-uv-r0939007802 in-secondary:width-min-100pct-145px" />
        <div className="skeleton loading-rescue-action secondary border-uv-border text-uv-text bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-210px h-11 rounded-uv-r0939007802 in-secondary:width-min-100pct-145px" />
      </div>
    </main>
  );
}
