"use client";

import { useTranslations } from "@/i18n/client";

export default function Loading() {
  const t = useTranslations();
  return (
    <main className="page core-loading [display:flex] [flex-direction:column] [gap:14px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]" aria-busy="true" aria-label={t("loading.surface", { surface: t("loading.recurringWeaknesses") })}>
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]" aria-hidden="true">
        <div className="skeleton loading-mistakes-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(85%,_390px)] [height:48px]" />
        <div className="skeleton loading-mistakes-count [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:190px] [height:16px]" />
        <div className="skeleton loading-mistakes-refresh [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:215px] [height:44px] [border-radius:12px]" />
      </section>

      <section className="mistake-cluster-list [display:flex] [flex-direction:column] [gap:12px]" aria-hidden="true">
        <div className="loading-mistakes-heading [display:flex] [flex-direction:column] [gap:8px]">
          <div className="skeleton loading-mistakes-kicker [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:145px] [height:12px]" />
          <div className="skeleton loading-mistakes-subtitle [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(65%,_250px)] [height:25px]" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <article className="panel mistake-cluster [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:16px] [border-radius:18px]" key={index}>
            <div className="mistake-cluster-head [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:14px] [&_h2]:[margin:8px_0_0] [&_h2]:[font-size:1.08rem] [&_h2]:[letter-spacing:-0.025em] [&_h2]:[text-transform:capitalize] [&_>_svg]:[color:var(--text-muted)] [&_>_svg]:[flex:0_0_auto]">
              <div className="loading-mistakes-heading [display:flex] [flex-direction:column] [gap:8px]">
                <div className="loading-mistakes-badges [display:flex] [gap:7px] [&_.skeleton]:[width:80px] [&_.skeleton]:[height:24px] [&_.skeleton]:[border-radius:8px] [&_.skeleton:last-child]:[width:115px]">
                  <div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" /><div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" />
                </div>
                <div className="skeleton loading-mistakes-cluster-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(65vw,_270px)] [height:24px]" />
              </div>
              <div className="skeleton loading-mistakes-icon [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:20px] [height:20px]" />
            </div>
            <div className="mistake-pattern-items [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
              {Array.from({ length: 2 }, (_, row) => (
                <div className="mistake-pattern-row [display:flex] [flex-direction:column] [gap:12px] [padding:14px_0] [border-bottom:1px_solid_var(--border)] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:minmax(0,_1fr)_auto] min-[620px]:[align-items:center]" key={row}>
                  <div className="loading-mistakes-copy [display:flex] [flex-direction:column] [gap:8px] [&_.skeleton]:[width:min(60vw,_300px)] [&_.skeleton]:[height:16px] [&_.skeleton:last-child]:[width:min(48vw,_210px)]">
                    <div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" />
                    <div className="skeleton [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite]" />
                  </div>
                  <div className="skeleton loading-mistakes-resolve [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:90px] [height:38px] [border-radius:10px]" />
                </div>
              ))}
            </div>
            <div className="skeleton loading-mistakes-practice [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(100%,_235px)] [height:44px] [border-radius:12px]" />
          </article>
        ))}
      </section>
    </main>
  );
}
