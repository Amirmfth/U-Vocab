export default function GrammarLoading() {
  return (
    <main className="page grammar-hub flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 gap-4.5">
      <div className="skeleton loading-home-hero rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite min-h-51.25" />
      <div className="grammar-summary grid grid-template-columns-repeat-2-minmax-0-1fr overflow-hidden border-1px-solid-border-2 rounded-exact-16px bg-uv-surface in-div:min-h-18 in-div:flex in-div:flex-col in-div:justify-center in-div:gap-0.75 in-div:padding-11px-12px in-div-nth-child-even:border-1px-solid-border-5 in-div-nth-child-n-3:border-1px-solid-border-3 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-1p25rem in-span:text-uv-text-muted in-span:text-exact-0p66rem uv-min620:grid-template-columns-repeat-4-minmax-0-1fr uv-min620:in-div-nth-child-n-3:border-0 uv-min620:in-div-div:border-1px-solid-border-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton loading-metric bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17 rounded-none" key={index} />
        ))}
      </div>
      <div className="skeleton-stack flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton loading-action-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-19.5 rounded-exact-14px" key={index} />
        ))}
      </div>
    </main>
  );
}
