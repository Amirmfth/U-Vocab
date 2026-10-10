export default function GrammarLoading() {
  return (
    <main className="page grammar-hub flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 gap-4.5">
      <div className="skeleton loading-home-hero rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite min-h-51.25" />
      <div className="grammar-summary grid grid-template-columns-repeat-2-minmax-0-1fr overflow-hidden border-1px-solid-border-2 rounded-uv-r4678bd4d8a bg-uv-surface in-div:min-h-18 in-div:flex in-div:flex-col in-div:justify-center in-div:gap-0.75 in-div:padding-11px-12px in-div-nth-child-even:border-1px-solid-border-5 in-div-nth-child-n-3:border-1px-solid-border-3 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-uv-f081acf2896 in-span:text-uv-text-muted in-span:text-uv-ff7862da171 uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div-nth-child-n-3:border-0 uv-min620:in-div-div:border-1px-solid-border-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton loading-metric bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17 rounded-none" key={index} />
        ))}
      </div>
      <div className="skeleton-stack flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton loading-action-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-19.5 rounded-uv-rd65225386d" key={index} />
        ))}
      </div>
    </main>
  );
}
