"use client";

import { useTranslations } from "@/i18n/client";

type LoadingVariant =
  | "home"
  | "words"
  | "word"
  | "review"
  | "practice"
  | "writing"
  | "writing-session"
  | "reading"
  | "reading-detail [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px]"
  | "speaking"
  | "conversation"
  | "cards";

function HeaderSkeleton({ compact = true }: { compact?: boolean }) {
  return (
    <section className={"page-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem " + (compact ? "compact" : "")}>
      <div className="skeleton skeleton-kicker rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-3" />
      <div className="skeleton skeleton-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-88pct-560px h-13.5" />
      <div className="skeleton skeleton-copy rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-96pct-620px h-4.5" />
    </section>
  );
}

function LoadingCollection({ count = 3 }: { count?: number }) {
  return (
    <section className="page-section flex flex-col gap-3" aria-hidden="true">
      <div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" />
      <div className="collection-list flex flex-col">
        {Array.from({ length: count }, (_, index) => (
          <div className="collection-row loading-collection-row border-1px-solid-border grid grid-template-columns-minmax-0-1fr-auto items-center gap-3 padding-11px-2px in-strong-2:block in-span:block in-span:mt-0.75 in-span:text-uv-text-muted in-span:text-exact-0p76rem uv-min940:hover:bg-uv-surface min-h-17" key={index}>
            <div className="skeleton-stack flex flex-col gap-3">
              <div className="skeleton loading-collection-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-55vw-250px h-4.5" />
              <div className="skeleton loading-collection-meta rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-68vw-320px h-3.25" />
            </div>
            <div className="skeleton loading-collection-arrow rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-4.5 h-4.5" />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingField({ name }: { name?: string }) {
  return (
    <div className="field loading-field-group in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560 flex flex-col gap-2 min-w-0" aria-label={name}>
      <div className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" />
      <div className="skeleton loading-setting-control bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-full h-12 rounded-exact-12px" />
    </div>
  );
}

export function RouteLoading({
  variant = "cards",
}: {
  variant?: LoadingVariant;
}) {
  const t = useTranslations();
  const loading = (surface: string) => t("loading.surface", { surface });
  if (variant === "home") {
    return (
      <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("nav.home"))}>
        <section className="home-focus loading-home-hero pt-6 max-w-uv-8b89fb679d in-hero-actions:mt-6 flex flex-col gap-3 padding-12px-0-2px in-h1:m-0 in-h1:max-w-uv-c078f10a0b in-h1:text-exact-clamp-2p35rem-12vw-5p4rem in-h1:line-height-0p94 in-h1:letter-spacing-0p06em in-h1:font-560 in-page-description:max-w-150 min-h-51.25 uv-min940:pt-7">
          <div className="skeleton skeleton-kicker rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-3" />
          <div className="skeleton loading-hero-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-86pct-480px h-14.5" />
          <div className="skeleton skeleton-copy rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-96pct-620px h-4.5" />
          <div className="skeleton loading-primary-action bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-240px h-12.5 rounded-exact-14px" />
        </section>
        <section className="home-metrics loading-metrics border-1px-solid-border-3 border-1px-solid-border in-a:flex in-a:flex-col in-a:gap-0.5 in-a:padding-16px-10px in-a:text-uv-text-muted in-a-a:border-1px-solid-border-5 in-strong-2:text-uv-text grid grid-template-columns-repeat-3-minmax-0-1fr border-1px-solid-border-6 in-a-2:min-w-0 in-a-2:min-h-18.5 in-a-2:flex in-a-2:flex-col in-a-2:justify-center in-a-2:gap-1 in-a-2:padding-12px-10px in-a-a-2:border-1px-solid-border-5 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-exact-clamp-1p1rem-5vw-1p55rem in-strong-2:font-tabular-nums in-span:overflow-hidden in-span:text-uv-text-muted in-span:text-exact-0p66rem in-span:line-height-1p25 in-span:text-overflow-ellipsis">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton loading-metric bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17 rounded-none" key={index} />
          ))}
        </section>
        <section className="home-next-grid grid grid-template-columns-1fr uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:grid-template-columns-repeat-3-minmax-0-1fr gap-2 uv-min940:gap-3">
          <div className="skeleton loading-action-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-19.5 rounded-exact-14px" />
          <div className="skeleton loading-action-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-19.5 rounded-exact-14px" />
        </section>
      </main>
    );
  }

  if (variant === "words") {
    return (
      <main className="page core-loading vocabulary-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full in-library-header:flex-row in-library-header:items-center in-library-header:justify-between in-library-header:gap-5 in-library-header:pt-4.5 in-library-header:pb-2.5 in-library-header-h1:m-0 in-library-header-h1:min-w-0 in-library-header-h1:text-exact-clamp-1p65rem-7vw-3rem in-library-header-button:w-auto in-library-header-button:flex-0-0-auto in-library-header-actions:items-stretch in-library-primary-actions:gap-2 in-ia-subnav:py-0.5 in-library-tools:gap-2.5 in-filter-chip-row:pb-1 in-vocabulary-list:mt-0.5 in-vocabulary-list:border-t-uv-border-strong in-vocabulary-row:min-h-20.5 in-vocabulary-row:py-3.5 in-vocabulary-row:bg-transparent in-vocabulary-row:content-visibility-auto in-vocabulary-row:contain-intrinsic-size-auto-82px in-vocabulary-row:transition-background-140ms-ease-border-color-140ms-ease-transf in-vocabulary-row-nth-child-even:bg-transparent in-vocabulary-row-word:text-exact-1p08rem in-vocabulary-row-word:font-650 in-vocabulary-row-word:letter-spacing-0p025em in-translation-line:mt-1.25 in-translation-line-span:text-uv-text-soft in-translation-line-span:text-exact-0p78rem in-vocabulary-row-meta:min-w-19.5 in-vocabulary-row-meta:gap-1.25 in-vocabulary-row-meta-span-first-child:text-uv-text-muted in-vocabulary-row-meta-span-first-child:font-font-geist-mono-geist-mono-monospace in-vocabulary-row-meta-span-first-child:text-exact-0p62rem in-row-signal:border-uv-border-strong in-row-signal:bg-uv-c7ef9eb4aa9 in-vocabulary-row-meta-strong:mt-0.25 in-vocabulary-row-meta-strong:text-uv-text in-vocabulary-row-meta-strong:text-exact-0p7rem in-mastery-line:opacity-82 uv-min620:in-library-header-actions:items-end uv-min620:in-vocabulary-row:min-h-22 uv-min620:in-vocabulary-row:padding-15px-10px uv-min940:in-library-header:pt-7.5 uv-min940:in-vocabulary-row:-mx-3 uv-min940:in-vocabulary-row:px-3 uv-min940:in-vocabulary-row:border-b-uv-c651b85d40c uv-min940:in-vocabulary-row:rounded-exact-12px uv-min940:in-vocabulary-row-hover:z-index-1 uv-min940:in-vocabulary-row-hover:border-transparent uv-min940:in-vocabulary-row-hover:bg-uv-surface uv-min940:in-vocabulary-row-hover:transform-translatex-2px" aria-busy="true" aria-label={loading(t("vocab.title"))}>
        <section className="page-header compact library-header padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 flex flex-col in-h1:mb-1 in-compact-h1:mb-1 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between uv-min620:in-button-2:w-auto gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem max-w-none" aria-hidden="true">
          <div className="skeleton loading-vocabulary-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-38vw-280px h-12" />
          <div className="skeleton loading-add-word bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-30 h-11 rounded-exact-12px" />
        </section>
        <div className="skeleton loading-search bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-12 rounded-exact-14px" />
        <div className="vocabulary-controls-row flex items-center justify-between gap-2.5 in-translation-switch:flex-0-1-auto in-translation-switch:min-w-0 in-filter-builder:flex-0-0-auto" aria-hidden="true">
          <div className="loading-language-switch flex gap-0.75 p-0.75 border-1px-solid-border-2 rounded-exact-11px in-skeleton:w-10.75 in-skeleton:h-9 in-skeleton:rounded-exact-8px in-skeleton-last-child:w-13.75">
            <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
            <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
            <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
          </div>
          <div className="skeleton loading-add-filter bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-28 h-11 rounded-exact-11px" />
        </div>
        <div className="skeleton loading-list-count rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-30 h-3.5 mt-0.5" aria-hidden="true" />
        <div className="vocabulary-list flex flex-col border-1px-solid-border-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="vocabulary-row loading-vocabulary-row in-nth-child-even:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative grid grid-template-columns-minmax-0-1fr-auto gap-8px-12px padding-12px-2px-13px border-1px-solid-border bg-transparent in-word:overflow-hidden in-word:text-exact-1p04rem in-word:line-height-1p25 in-word:text-overflow-ellipsis in-word:whitespace-nowrap in-mastery-line:grid-column-1-1 in-mastery-line:h-0.75 in-mastery-line:-mt-0.5 min-h-20.5 in-skeleton-stack:gap-2.25 uv-min620:min-h-21 uv-min620:px-2" key={index} aria-hidden="true">
              <div className="vocabulary-row-main skeleton-stack flex flex-col gap-3 min-w-0">
                <div className="skeleton loading-row-word rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-55vw-220px h-5.75" />
                <div className="skeleton loading-row-translation rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-45vw-170px h-3.5" />
              </div>
              <div className="skeleton loading-row-meta rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22 h-4.25" />
              <div className="skeleton loading-row-mastery bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite grid-column-1-1 h-1 rounded-exact-999px" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (variant === "word") {
    return (
      <main className="page core-loading word-detail-page flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 w-full gap-4.5 in-word-detail-topline:grid in-word-detail-topline:grid-template-columns-minmax-0-1fr-auto in-word-detail-topline:items-start in-word-detail-topline:gap-3 in-word-detail-topline-word-meta:min-w-0 in-word-primary-actions:mt-0.5 in-word-quick-actions:gap-1.75 in-word-quick-actions-descendants:min-height-tap-target in-word-detail-grid:gap-2.5 in-word-detail-card:border-uv-border in-word-detail-card:bg-uv-surface in-word-detail-card-eyebrow:mb-0.5 in-lesson-meaning:text-exact-1p18rem in-mastery-row:gap-1.5 in-intelligence-panel:border-uv-border in-example-card:min-h-37.5 in-example-card-strong:text-exact-1rem in-example-card-strong:line-height-1p6 in-relation-chip:transition-border-color-140ms-ease-background-140ms-ease-transf uv-min620:in-word-primary-actions:items-start uv-min940:in-word-detail-grid:grid-template-columns-minmax-0-1p15fr-minmax-300px-0p85fr uv-min940:in-word-detail-grid:items-start uv-min940:in-word-detail-disclosure:grid-column-1-1 uv-min940:in-relation-chip-hover:border-uv-border-strong uv-min940:in-relation-chip-hover:bg-uv-surface-soft uv-min940:in-relation-chip-hover:transform-translatey-1px" aria-busy="true" aria-label={loading(t("loading.word"))}>
        <section className="page-header word-identity-hero flex flex-col in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 pt-4 relative gap-3.5 overflow-hidden p-5 border-1px-solid-border-2 rounded-exact-radius-lg bg-radial-gradient-circle-at-100pct-0pct-rgb-139-124-255-0p11-t in-h1:max-w-uv-0927635a28 in-h1:text-exact-clamp-2p2rem-8vw-4p6rem in-h1:line-height-1p02 in-h1:letter-spacing-0p065em in-h1:overflow-wrap-anywhere in-page-description:text-uv-text-muted in-page-description:text-exact-0p82rem uv-min620:p-6.5 uv-min940:p-7.5" aria-hidden="true">
          <div className="word-detail-topline flex flex-col gap-2.5 uv-min620:flex-row uv-min620:items-center uv-min620:justify-between uv-max619:items-start uv-max619:in-word-meta:gap-1.25 uv-max619:in-badge-nth-child-n-3:hidden">
            <div className="loading-word-badges flex flex-wrap gap-1.75 in-skeleton:w-16.25 in-skeleton:h-6.5 in-skeleton:rounded-exact-8px in-skeleton-nth-child-2:w-20.5">
              <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
            </div>
            <div className="loading-language-switch loading-language-switch--word flex gap-0.75 p-0.75 border-1px-solid-border-2 rounded-exact-11px in-skeleton:w-10.75 in-skeleton:h-9 in-skeleton:rounded-exact-8px in-skeleton-last-child:w-10.75">
              <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" />
            </div>
          </div>
          <div className="skeleton loading-word-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-75pct-450px height-clamp-40px-9vw-70px" />
          <div className="word-hero-meanings mt-1 pt-4.5 border-1px-solid-border-3"><div className="skeleton loading-word-meaning rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-65pct-330px h-7.25" /></div>
        </section>
        <nav className="word-detail-actions flex flex-wrap gap-2 in-button:flex-1-1-165px in-button:min-height-tap-target in-word-quick-action-button:flex-1-1-165px in-word-quick-action-button:min-height-tap-target" aria-hidden="true">
          <div className="skeleton loading-word-action bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite flex-1-1-165px h-11 rounded-exact-12px" />
          <div className="skeleton loading-word-action bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite flex-1-1-165px h-11 rounded-exact-12px" />
        </nav>
        <section className="page-section flex flex-col gap-3" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" />
          <div className="loading-example-grid grid gap-3 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
            <div className="skeleton loading-example-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-37.5 rounded-exact-14px" />
            <div className="skeleton loading-example-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-37.5 rounded-exact-14px" />
          </div>
        </section>
        <div className="skeleton loading-word-disclosure bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17.5 rounded-exact-14px" aria-hidden="true" />
        <div className="skeleton loading-word-disclosure bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17.5 rounded-exact-14px" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "review") {
    return (
      <main className="page core-loading review-landing review-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto in-review-hero:gap-5 in-review-hero:p-5 in-review-hero:border-1px-solid-border-2 in-review-hero:rounded-exact-radius-lg in-review-hero:bg-radial-gradient-circle-at-100pct-0pct-rgb-139-124-255-0p12-t in-review-hero-h1:mt-1.5 in-review-hero-h1:text-exact-clamp-2p6rem-13vw-5p6rem in-review-hero-p-not-eyebrow:max-w-135 in-review-start:min-h-13 in-review-queue-summary:border-uv-border-strong in-review-queue-summary:bg-transparent in-review-queue-summary-div:min-h-19.5 in-review-queue-summary-strong:text-exact-1p45rem in-review-queue-summary-strong:letter-spacing-0p05em-2 in-review-mode-list:gap-0 in-review-mode-list-a:min-h-17.5 in-review-mode-list-a:transition-background-140ms-ease-color-140ms-ease-transform-140 in-review-mode-list-a-active:transform-scale-0p995 uv-min620:in-review-hero:p-6 uv-min940:pt-5.5 uv-min940:in-review-hero:p-7 uv-min940:in-review-mode-list:grid uv-min940:in-review-mode-list:grid-template-columns-repeat-3-minmax-0-1fr uv-min940:in-review-mode-list:gap-2.5 uv-min940:in-review-mode-list:border-0 uv-min940:in-review-mode-list-a:min-h-28 uv-min940:in-review-mode-list-a:grid-template-columns-30px-minmax-0-1fr uv-min940:in-review-mode-list-a:align-content-center uv-min940:in-review-mode-list-a:p-4 uv-min940:in-review-mode-list-a:border! uv-min940:in-review-mode-list-a:border-uv-border! uv-min940:in-review-mode-list-a:rounded-exact-16px uv-min940:in-review-mode-list-a:bg-uv-surface uv-min940:in-review-mode-list-a-svg-last-child:grid-column-2 uv-min940:in-review-mode-list-a-svg-last-child:mt-0.75 uv-min940:in-review-mode-list-a-hover:border-uv-border-strong! uv-min940:in-review-mode-list-a-hover:bg-uv-surface-raised uv-min940:in-review-mode-list-a-hover:transform-translatey-2px" aria-busy="true" aria-label={loading(t("nav.review"))}>
        <section className="review-hero flex flex-col gap-4 padding-14px-0-4px in-h1:margin-4px-0-0 in-h1:text-exact-clamp-2p3rem-12vw-5rem in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 in-p-not-eyebrow:margin-9px-0-0 in-p-not-eyebrow:max-w-150 in-p-not-eyebrow:text-uv-text-soft in-p-not-eyebrow:line-height-1p55 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between">
          <div className="skeleton-stack flex flex-col gap-3">
            <div className="skeleton loading-hero-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-86pct-480px h-14.5" />
            <div className="skeleton skeleton-copy rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-96pct-620px h-4.5" />
          </div>
          <div className="skeleton loading-primary-action bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-240px h-12.5 rounded-exact-14px" />
        </section>
        <section className="practice-lanes review-mode-grid in-practice-lane:relative grid grid-template-columns-repeat-2-minmax-0-1fr gap-3" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="practice-lane loading-mode-card min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 border-1px-solid-border-2 rounded-exact-18px bg-uv-surface relative" key={index}>
              <div className="skeleton loading-count-badge bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite absolute top-3 right-3 w-6 h-6 rounded-exact-999px" />
              <div className="skeleton loading-card-icon bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-14.5 h-14.5 rounded-exact-17px" />
              <div className="skeleton loading-card-label bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-21.5 max-width-80pct h-4.25 rounded-exact-6px" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "practice") {
    return (
      <main className="page core-loading practice-hub flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("nav.practice"))}>
        <section className="practice-lanes grid grid-template-columns-repeat-2-minmax-0-1fr gap-3" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={"practice-lane loading-mode-card min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 border-1px-solid-border-2 rounded-exact-18px bg-uv-surface relative" + (index === 0 ? " practice-lane-grammar grid-column-1-1" : "")} key={index}>
              <div className="skeleton loading-card-icon bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-14.5 h-14.5 rounded-exact-17px" />
              <div className="skeleton loading-card-label bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-21.5 max-width-80pct h-4.25 rounded-exact-6px" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "writing") {
    return (
      <main className="page core-loading writing-hub flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b in-writing-start-form:max-w-uv-e83c9a8a13 in-writing-start-form:gap-4 in-writing-start-form:p-4.5 in-writing-start-form:border-uv-border-strong in-writing-start-form:bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-70p in-writing-start-form-button:min-h-13 in-collection-list:border-1px-solid-border-3 in-collection-row:min-h-17 in-collection-row:px-1 uv-min620:in-writing-start-form:p-5.5 uv-min940:pt-3 uv-min940:in-writing-start-form:grid uv-min940:in-writing-start-form:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:in-writing-start-form-writing-settings-row:grid-column-1-1 uv-min940:in-writing-start-form-field:grid-column-1-1 uv-min940:in-writing-start-form-status-notice:grid-column-1-1 uv-min940:in-writing-start-form-button-2:grid-column-1-1" aria-busy="true" aria-label={loading(t("nav.writing"))}>
        <section className="page-header compact practice-workbench-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 max-width-content-reading pt-5 in-h1:text-exact-clamp-2p5rem-12vw-5rem" aria-hidden="true"><div className="skeleton loading-hub-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-75pct-340px h-12.5 in-wide:width-min-90pct-570px" /></section>
        <section className="panel writing-start-form loading-hub-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex-col uv-min620:in-status-notice:grid-column-1-1 uv-min620:in-button:grid-column-1-1 rounded-exact-18px p-3.75 grid gap-4.5 in-loading-hub-form:flex in-loading-hub-form:flex-col uv-min940:in-loading-hub-form:grid uv-min940:in-loading-hub-form:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:in-loading-hub-form-descendants:grid-column-1-1" aria-hidden="true">
          <div className="writing-settings-row grid grid-template-columns-repeat-2-minmax-0-1fr gap-3"><LoadingField name={t("writing.mode")} /><LoadingField name={t("writing.level")} /></div>
          <div className="writing-settings-row grid grid-template-columns-repeat-2-minmax-0-1fr gap-3"><LoadingField name={t("writing.type")} /><LoadingField name={t("writing.targetLength")} /></div>
          <div className="field writing-topic-field loading-field-group in-label:text-uv-text-soft in-label:text-exact-0p83rem in-label:font-560 grid-column-1-1 flex flex-col gap-2 min-w-0"><div className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" /><div className="skeleton loading-setting-control bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-full h-12 rounded-exact-12px" /></div>
          <div className="skeleton loading-form-submit bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-220px h-11 rounded-exact-12px" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading") {
    return (
      <main className="page core-loading reading-hub generated-reading-hub flex flex-col reading-measure-68ch gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b in-reading-form:max-w-uv-e83c9a8a13 in-reading-form:gap-4 in-reading-form:p-4.5 in-reading-form:border-uv-border-strong in-reading-form:bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-70p in-reading-form-button:min-h-13 in-collection-list:border-1px-solid-border-3 in-collection-row:min-h-17 in-collection-row:px-1 uv-min620:in-reading-form:p-5.5 uv-min940:pt-3" aria-busy="true" aria-label={loading(t("nav.reading"))}>
        <section className="page-header compact practice-workbench-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 max-width-content-reading pt-5 in-h1:text-exact-clamp-2p5rem-12vw-5rem" aria-hidden="true"><div className="skeleton loading-hub-title wide rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-75pct-340px h-12.5 in-wide:width-min-90pct-570px" /></section>
        <section className="panel story-form reading-generation-form loading-hub-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 w-full max-w-uv-5dbc91eac8 rounded-exact-18px grid gap-4.5" aria-hidden="true">
          <div className="form-grid story-settings-grid grid gap-3 grid-template-columns-repeat-2-minmax-0-1fr uv-min620:grid-template-columns-repeat-2-minmax-0-1fr"><LoadingField name={t("reading.length")} /><LoadingField name={t("reading.grammarFocus")} /></div>
          <LoadingField name={t("reading.topic")} />
          <fieldset className="target-picker story-target-picker loading-target-picker m-0 in-legend:mb-2 in-legend:text-uv-text-soft in-legend:text-exact-0p83rem in-legend:font-560 in-story-picker-hint:margin-10px-0-0 grid gap-3 p-4 border-1px-solid-border-2 rounded-exact-14px in-legend-skeleton:block">
            <legend><span className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" /></legend>
            <div className="story-word-search skeleton loading-setting-control bg-200pct-100pct animation-shimmer-1p4s-infinite flex items-center gap-2.25 padding-0-12px border-1px-solid-border-2 bg-uv-surface-raised text-uv-text-muted in-input:min-h-11.5 in-input:border-0 in-input:p-0 in-input:bg-transparent in-focus-within:border-uv-primary w-full h-12 rounded-exact-12px" />
            <div className="skeleton loading-target-hint rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-370px h-3.75" />
          </fieldset>
          <div className="skeleton loading-form-submit bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-220px h-11 rounded-exact-12px" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "speaking") {
    return (
      <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("practice.speaking"))}>
        <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem" aria-hidden="true"><div className="skeleton loading-hub-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-75pct-340px h-12.5 in-wide:width-min-90pct-570px" /></section>
        <section className="panel conversation-start-form loading-hub-form border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex-col uv-min620:grid uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min620:in-field-first-of-type:grid-column-1-1 uv-min620:in-conversation-toggle:grid-column-1-1 uv-min620:in-status-notice:grid-column-1-1 uv-min620:in-button:grid-column-1-1 rounded-exact-18px grid gap-4.5 in-loading-hub-form:flex in-loading-hub-form:flex-col uv-min620:in-loading-hub-form:grid uv-min620:in-loading-hub-form:grid-template-columns-repeat-2-minmax-0-1fr uv-min620:in-loading-hub-form-field-first-child:grid-column-1-1 uv-min620:in-loading-hub-form-loading-form-submit:grid-column-1-1" aria-hidden="true">
          <LoadingField name={t("writing.mode")} />
          <LoadingField name={t("conversation.topic")} />
          <LoadingField name={t("conversation.targets")} />
          <LoadingField name={t("conversation.tone")} />
          <LoadingField name={t("conversation.formality")} />
          <div className="skeleton loading-form-submit bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-220px h-11 rounded-exact-12px" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading-detail [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px]") {
    return (
      <main className="page core-loading generated-reading-page flex flex-col reading-measure-68ch gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("loading.readingDetail"))}>
        <section className="page-header compact reading-document-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 max-w-uv-a9051779da in-h1:text-exact-clamp-2p25rem-9vw-4p4rem" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-4.5" />
          <div className="loading-meta-badges flex flex-wrap gap-1.75 in-skeleton:w-15.75 in-skeleton:h-6.25 in-skeleton:rounded-exact-8px in-skeleton-nth-child-even:w-21.25"><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /></div>
          <div className="skeleton loading-document-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-82pct-510px h-13" />
        </section>
        <article className="panel generated-reading-text loading-reading-document border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 max-width-reading-measure mx-auto padding-clamp-22px-4vw-40px text-exact-clamp-1p03rem-2vw-1p14rem line-height-1p8 in-p-p:margin-top-1p15em uv-max720:p-4.5 uv-max720:line-height-1p72 rounded-exact-18px min-h-85 in-reading-target-word:inline in-reading-target-word:padding-0-2px in-reading-target-word:border-0 in-reading-target-word:rounded-exact-4px in-reading-target-word:bg-color-mix-in-srgb-primary-22pct-transparent in-reading-target-word:text-uv-primary-strong in-reading-target-word:font-inherit in-reading-target-word:font-680 in-reading-target-word:line-height-inherit in-reading-target-word:cursor-pointer in-reading-target-word:box-decoration-break-clone in-reading-target-word-hover:bg-color-mix-in-srgb-primary-36pct-transparent in-reading-target-word-aria-expanded-true:bg-color-mix-in-srgb-primary-36pct-transparent" aria-hidden="true">
          <div className="loading-reading-paragraphs grid gap-6">
            {Array.from({ length: 3 }, (_, paragraph) => (
              <div className="loading-generated-paragraphs grid gap-2.75 in-skeleton:w-full in-skeleton:h-3.75 in-skeleton-nth-child-3n:width-68pct in-skeleton-nth-child-5n:width-86pct" key={paragraph}>
                {Array.from({ length: 4 }, (_, line) => <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" key={line} />)}
              </div>
            ))}
          </div>
        </article>
        <section className="panel reading-language-notes loading-reading-notes border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto in-blockquote:margin-10px-0 in-blockquote:ps-3 in-blockquote:border-2px-solid-border in-blockquote:text-uv-text-muted rounded-exact-18px grid gap-3.75" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" />
          <div className="skeleton loading-scenario rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-520px h-4.5 in-short:width-min-65pct-340px" />
          <div className="skeleton loading-note-row bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-13 rounded-exact-11px" />
        </section>
        <section className="panel reading-assessment loading-reading-assessment border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto rounded-exact-18px grid gap-5.5" aria-hidden="true">
          <div className="loading-reading-assessment-head grid gap-2"><div className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" /><div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" /></div>
          {Array.from({ length: 2 }, (_, index) => (
            <div className="reading-question loading-reading-question border-0 border-1px-solid-border-3 in-legend:flex-wrap in-legend:font-650 grid min-w-0 gap-3.75 padding-19px-0-0 in-legend:w-full in-legend:flex in-legend:items-start in-legend:gap-2.75 in-legend:p-0 in-has-reading-answer-feedback-is-wrong-reading-question-o:border-uv-danger in-has-reading-answer-feedback-is-wrong-reading-question-o:bg-uv-c8b3083dabe" key={index}>
              <div className="loading-question-heading flex items-start gap-3 in-skeleton-stack:flex-1 in-skeleton-stack:gap-2.25"><div className="skeleton loading-question-number bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-8.5 h-8.5 rounded-exact-10px" /><div className="skeleton-stack flex flex-col gap-3"><div className="skeleton loading-question-type bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-25 h-5.5 rounded-exact-8px" /><div className="skeleton loading-question-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-450px h-5" /></div></div>
              <div className="reading-question-options grid in-label:flex in-label:gap-2.5 in-label:items-start in-label:padding-10px-12px in-label:border-1px-solid-border-2 in-label:rounded-exact-12px in-label:cursor-pointer uv-max720:in-label:p-2.75 gap-2.25">
                {Array.from({ length: 4 }, (_, option) => <div className="skeleton loading-question-option bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-13 rounded-exact-12px" key={option} />)}
              </div>
            </div>
          ))}
          <div className="skeleton loading-form-submit bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-220px h-11 rounded-exact-12px" />
        </section>
        <section className="panel reading-language-summary loading-reading-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 max-w-uv-a9051779da mx-auto rounded-exact-18px grid gap-3.75" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" />
          <div className="loading-target-chips flex flex-wrap gap-1.75 in-skeleton:w-21.25 in-skeleton:h-7 in-skeleton:rounded-exact-999px"><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /></div>
        </section>
        <section className="panel story-summary loading-reading-summary border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 in-p-2:line-height-1p65 rounded-exact-18px grid gap-3.75" aria-hidden="true"><div className="skeleton loading-section-heading rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" /><div className="skeleton loading-scenario rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-520px h-4.5 in-short:width-min-65pct-340px" /><div className="skeleton loading-scenario short rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-520px h-4.5 in-short:width-min-65pct-340px" /></section>
      </main>
    );
  }

  if (variant === "conversation") {
    return (
      <main className="page core-loading conversation-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("loading.speakingSession"))}>
        <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-exact-clamp-2rem-9vw-4p5rem" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-4.5" />
          <div className="word-meta loading-meta-badges items-center flex flex-wrap gap-1.75 in-skeleton:w-15.75 in-skeleton:h-6.25 in-skeleton:rounded-exact-8px in-skeleton-nth-child-even:w-21.25">{Array.from({ length: 5 }, (_, index) => <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" key={index} />)}</div>
          <div className="skeleton loading-document-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-82pct-510px h-13" />
          <div className="skeleton loading-scenario rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-520px h-4.5 in-short:width-min-65pct-340px" />
          <div className="mission-objective loading-mission-objective flex gap-2.5 padding-12px-13px border-1px-solid-border-2 rounded-exact-13px bg-uv-surface-raised in-svg:flex-0-0-auto in-svg:mt-0.5 in-div:flex in-div:flex-col in-div:gap-0.75 in-span:text-uv-text-muted in-span:line-height-1p45 items-center"><div className="skeleton loading-objective-icon rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-4.5 h-4.5" /><div className="skeleton-stack flex flex-col gap-3"><div className="skeleton loading-objective-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-18.75 h-3.5" /><div className="skeleton loading-objective-copy rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-65vw-310px h-3.75" /></div></div>
        </section>
        <section className="conversation-targets loading-conversation-targets overflow-x-auto pb-0.75 flex flex-wrap gap-2 in-skeleton:w-30 in-skeleton:h-10.75 in-skeleton:rounded-exact-11px" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" key={index} />)}
        </section>
        <section className="conversation-chat loading-conversation-chat flex flex-col gap-3.5 w-full max-w-uv-a9051779da mx-auto min-h-82.5" aria-hidden="true">
          <div className="conversation-messages flex flex-col gap-4.5 padding-12px-2px-112px uv-min620:pb-32">
            <div className="conversation-message is-assistant loading-conversation-message in-span-2:text-uv-text-muted in-span-2:text-exact-0p62rem in-span-2:font-650 in-span-2:uppercase in-span-2:letter-spacing-0p08em in-p:m-0 in-p:padding-11px-13px in-p:rounded-exact-14px in-p:line-height-1p55 in-p:whitespace-pre-wrap in-is-assistant:self-start in-is-assistant-p:border-1px-solid-border-2 in-is-assistant-p:bg-uv-surface in-is-user:self-end in-is-user-p:bg-uv-primary in-is-user-p:color-white w-full max-w-none flex flex-row gap-2.5 in-is-user:flex-row-reverse in-is-user:items-start in-is-user-conversation-avatar:border-color-mix-in-srgb-primary-42pct-border in-is-user-conversation-avatar:bg-uv-cbdfd7cd038 in-is-user-conversation-avatar:text-uv-primary-strong in-is-user-conversation-bubble:items-end in-is-user-conversation-bubble-p:border-transparent in-is-user-conversation-bubble-p:rounded-exact-18px-18px-6px-18px in-is-user-conversation-bubble-p:bg-uv-primary in-is-user-conversation-bubble-p:color-white items-start"><div className="skeleton loading-avatar bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-9 h-9 rounded-exact-50pct flex-0-0-auto" /><div className="skeleton loading-message bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-72pct-350px h-14.5 rounded-exact-14px in-response:width-min-60pct-270px" /></div>
            <div className="conversation-message is-user loading-conversation-message in-span-2:text-uv-text-muted in-span-2:text-exact-0p62rem in-span-2:font-650 in-span-2:uppercase in-span-2:letter-spacing-0p08em in-p:m-0 in-p:padding-11px-13px in-p:rounded-exact-14px in-p:line-height-1p55 in-p:whitespace-pre-wrap in-is-assistant:self-start in-is-assistant-p:border-1px-solid-border-2 in-is-assistant-p:bg-uv-surface in-is-user:self-end in-is-user-p:bg-uv-primary in-is-user-p:color-white w-full max-w-none flex flex-row gap-2.5 in-is-user:flex-row-reverse in-is-user:items-start in-is-user-conversation-avatar:border-color-mix-in-srgb-primary-42pct-border in-is-user-conversation-avatar:bg-uv-cbdfd7cd038 in-is-user-conversation-avatar:text-uv-primary-strong in-is-user-conversation-bubble:items-end in-is-user-conversation-bubble-p:border-transparent in-is-user-conversation-bubble-p:rounded-exact-18px-18px-6px-18px in-is-user-conversation-bubble-p:bg-uv-primary in-is-user-conversation-bubble-p:color-white items-start"><div className="skeleton loading-avatar bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-9 h-9 rounded-exact-50pct flex-0-0-auto" /><div className="skeleton loading-message response bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-72pct-350px h-14.5 rounded-exact-14px in-response:width-min-60pct-270px" /></div>
          </div>
          <div className="conversation-composer loading-conversation-composer flex-col uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-end uv-min620:in-textarea:min-h-16 sticky bottom-calc-mobile-nav-height-10px z-index-12 grid-template-columns-minmax-0-1fr-44px padding-8px-8px-6px-14px border-1px-solid-border-strong rounded-exact-20px bg-color-mix-in-srgb-surface-raised-96pct-transparent box-shadow-shadow backdrop-filter-blur-16px in-textarea:min-h-11 in-textarea:max-h-37.5 in-textarea:padding-10px-0-7px in-textarea:resize-none in-textarea:border-0 in-textarea:bg-transparent in-textarea:box-shadow-none in-textarea-focus:box-shadow-none uv-min620:bottom-4.5 flex gap-2 items-end"><div className="skeleton loading-chat-input bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite flex-1 h-15 rounded-exact-12px" /><div className="skeleton loading-chat-send bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-11 h-11 rounded-exact-11px" /></div>
        </section>
        <div className="skeleton loading-conversation-finish bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-180px h-11 rounded-exact-12px" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "writing-session") {
    return (
      <main className="page core-loading writing-session-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2991113b44 in-writing-task:max-w-uv-d1f4d3e141 in-writing-task:p-4.5 in-writing-task:bg-uv-surface in-writing-task-pre:text-exact-0p94rem in-writing-task-pre:line-height-1p7 in-writing-editor:max-w-uv-0927635a28 in-writing-editor:gap-3 in-writing-editor-textarea:min-height-52dvh in-writing-editor-textarea:p-4 in-writing-editor-textarea:border-uv-border-strong in-writing-editor-textarea:rounded-exact-18px in-writing-editor-textarea:bg-linear-gradient-180deg-rgb-255-255-255-0p018-transparent-18r in-writing-editor-textarea:text-exact-1p03rem in-writing-editor-textarea:line-height-1p75 in-writing-editor-textarea-focus:bg-uv-cfcbfb23a40 in-writing-editor-footer:border-uv-border-strong in-writing-editor-footer:box-shadow-0-14px-34px-rgb-0-0-0-0p26 in-writing-score-grid:border-uv-border-strong in-writing-score-grid:rounded-exact-18px in-writing-score-grid:bg-uv-surface in-writing-score-grid-div:min-h-18.5 in-writing-score-grid-div:justify-center in-writing-score-grid-div:p-3.5 in-writing-score-grid-strong:text-exact-1p35rem in-writing-summary:max-w-uv-d1f4d3e141 in-improved-writing:max-w-uv-d1f4d3e141 in-writing-feedback-section:max-w-uv-0927635a28 uv-min620:in-writing-editor-textarea:min-height-56vh uv-min620:in-writing-editor-textarea:p-5 uv-min940:in-writing-editor:max-w-uv-2e0eb67d1b uv-min940:in-writing-editor-footer:static uv-min940:in-writing-editor-footer:p-0 uv-min940:in-writing-editor-footer:border-0 uv-min940:in-writing-editor-footer:bg-transparent uv-min940:in-writing-editor-footer:box-shadow-none uv-min940:in-writing-editor-footer:backdrop-filter-none" aria-busy="true" aria-label={loading(t("loading.writingTask"))}>
        <section className="page-header compact writing-session-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 max-w-uv-d1f4d3e141 in-h1:text-exact-clamp-2p2rem-9vw-4p2rem in-h1:line-height-0p98" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-22.5 h-4.5" />
          <div className="word-meta loading-meta-badges items-center flex flex-wrap gap-1.75 in-skeleton:w-15.75 in-skeleton:h-6.25 in-skeleton:rounded-exact-8px in-skeleton-nth-child-even:w-21.25">{Array.from({ length: 3 }, (_, index) => <div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" key={index} />)}</div>
          <div className="skeleton loading-document-title rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-82pct-510px h-13" />
        </section>
        <section className="panel writing-task loading-writing-task border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex-col in-pre:m-0 in-pre:whitespace-pre-wrap in-pre:font-inherit in-pre:line-height-1p6 in-pre:text-uv-text-soft rounded-exact-18px grid gap-3" aria-hidden="true"><div className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" /><div className="skeleton loading-task-line rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-650px h-4.25 in-short:width-min-60pct-400px" /><div className="skeleton loading-task-line short rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-650px h-4.25 in-short:width-min-60pct-400px" /><div className="loading-target-chips flex flex-wrap gap-1.75 in-skeleton:w-21.25 in-skeleton:h-7 in-skeleton:rounded-exact-999px"><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /><div className="skeleton rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite" /></div></section>
        <section className="writing-editor loading-writing-editor-shell flex-col in-textarea:resize-y in-textarea:text-exact-1rem in-textarea:line-height-1p65 in-textarea:min-height-48dvh in-textarea:p-3.5 grid gap-3" aria-hidden="true">
          <div className="writing-editor-heading flex flex-col gap-0.75 in-label:text-uv-text in-label:text-exact-0p9rem in-label:font-650 in-span:text-uv-text-muted in-span:text-exact-0p72rem"><div className="skeleton loading-setting-label rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-70pct-115px h-3.5" /><div className="skeleton loading-scenario rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-90pct-520px h-4.5 in-short:width-min-65pct-340px" /></div>
          <div className="skeleton loading-writing-editor bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite min-height-48dvh rounded-exact-16px" />
          <div className="writing-editor-footer loading-writing-footer flex-col in-span-2:text-uv-text-muted in-span-2:font-font-geist-mono-geist-mono-monospace in-span-2:text-exact-0p74rem in-span-is-under:text-uv-warning uv-min620:flex-row uv-min620:items-center uv-min620:justify-between sticky bottom-calc-96px-env-safe-area-inset-bottom z-index-4 p-2.25 border-1px-solid-border-2 rounded-exact-15px bg-uv-c54c3fe5d99 backdrop-filter-blur-14px flex items-center justify-between gap-3 uv-max380:in-loading-form-submit:w-35 uv-min620:static uv-min620:p-0 uv-min620:border-0 uv-min620:bg-transparent uv-min620:backdrop-filter-none"><div className="skeleton loading-word-count rounded-exact-10px bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-31.25 h-3.75" /><div className="skeleton loading-form-submit bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-100pct-220px h-11 rounded-exact-12px" /></div>
        </section>
      </main>
    );
  }

  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("common.loading")}>
      <HeaderSkeleton />
      <section className="stats-grid grid grid-template-columns-1fr gap-3 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:grid-template-columns-repeat-4-minmax-0-1fr">
        <div className="skeleton skeleton-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-28 rounded-exact-radius-lg" />
        <div className="skeleton skeleton-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-28 rounded-exact-radius-lg" />
        <div className="skeleton skeleton-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-28 rounded-exact-radius-lg" />
      </section>
    </main>
  );
}
