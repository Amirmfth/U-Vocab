export default function GrammarLoading() {
  return (
    <main className="page grammar-hub [display:flex] [flex-direction:column] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [gap:18px]">
      <div className="skeleton loading-home-hero [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [min-height:205px]" />
      <div className="grammar-summary [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [overflow:hidden] [border:1px_solid_var(--border)] [border-radius:16px] [background:var(--surface)] [&_>_div]:[min-height:72px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[justify-content:center] [&_>_div]:[gap:3px] [&_>_div]:[padding:11px_12px] [&_>_div:nth-child(even)]:[border-left:1px_solid_var(--border)] [&_>_div:nth-child(n_+_3)]:[border-top:1px_solid_var(--border)] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:1.25rem] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.66rem] min-[620px]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] min-[620px]:[&_>_div:nth-child(n_+_3)]:[border-top:0] min-[620px]:[&_>_div_+_div]:[border-left:1px_solid_var(--border)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton loading-metric [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:68px] [border-radius:0]" key={index} />
        ))}
      </div>
      <div className="skeleton-stack [display:flex] [flex-direction:column] [gap:12px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton loading-action-row [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:78px] [border-radius:14px]" key={index} />
        ))}
      </div>
    </main>
  );
}
