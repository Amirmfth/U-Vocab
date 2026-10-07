"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading [display:flex] [flex-direction:column] [gap:14px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.rescueWords") })}>
      <section className="page-header compact rescue-loading-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]" aria-hidden="true">
        <div className="skeleton loading-rescue-back [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:78px] [height:20px]" />
        <div className="skeleton loading-rescue-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(75%,_310px)] [height:48px]" />
      </section>

      <section className="rescue-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="rescue-row [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [gap:12px] [align-items:start] [padding:14px_0] [border-bottom:1px_solid_var(--border)] min-[620px]:[align-items:center]" key={index}>
            <div className="skeleton loading-rescue-rank [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:20px] [height:14px] [margin-top:3px]" />
            <div className="rescue-row-copy [min-width:0] [display:flex] [flex-direction:column] [gap:8px] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[flex-direction:column] [&_>_div:first-child]:[gap:3px] [&_>_div:first-child_span]:[color:var(--text-muted)] [&_>_div:first-child_span]:[font-size:0.72rem]">
              <div className="skeleton loading-rescue-word [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(55vw,_220px)] [height:20px]" />
              <div className="skeleton loading-rescue-retrievability [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:125px] [height:13px]" />
              <div className="skeleton loading-rescue-reason [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(65vw,_260px)] [height:22px] [border-radius:8px]" />
            </div>
            <div className="skeleton loading-rescue-score [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:30px] [height:18px]" />
          </div>
        ))}
      </section>

      <div className="progress-actions [display:flex] [flex-direction:column] [gap:9px] min-[620px]:[flex-direction:row]" aria-hidden="true">
        <div className="skeleton loading-rescue-action [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(100%,_210px)] [height:44px] [border-radius:12px] [&.secondary]:[width:min(100%,_145px)]" />
        <div className="skeleton loading-rescue-action secondary [border-color:var(--border)] [color:var(--text)] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(100%,_210px)] [height:44px] [border-radius:12px] [&.secondary]:[width:min(100%,_145px)]" />
      </div>
    </main>
  );
}
