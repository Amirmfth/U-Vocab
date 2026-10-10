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
    <section className={"page-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade " + (compact ? "compact" : "")}>
      <div className="skeleton skeleton-kicker rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-3" />
      <div className="skeleton skeleton-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-86fd0a9d90 h-13.5" />
      <div className="skeleton skeleton-copy rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-df68a90156 h-4.5" />
    </section>
  );
}

function LoadingCollection({ count = 3 }: { count?: number }) {
  return (
    <section className="page-section flex flex-col gap-3" aria-hidden="true">
      <div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" />
      <div className="collection-list flex flex-col">
        {Array.from({ length: count }, (_, index) => (
          <div className="collection-row loading-collection-row uv-border-bottom-8d7f82f403 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface min-h-17" key={index}>
            <div className="skeleton-stack flex flex-col gap-3">
              <div className="skeleton loading-collection-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-86203ca63a h-4.5" />
              <div className="skeleton loading-collection-meta rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-407779a0e8 h-3.25" />
            </div>
            <div className="skeleton loading-collection-arrow rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-4.5 h-4.5" />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingField({ name }: { name?: string }) {
  return (
    <div className="field loading-field-group uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560 flex flex-col gap-2 min-w-0" aria-label={name}>
      <div className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" />
      <div className="skeleton loading-setting-control uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-full h-12 rounded-uv-r0939007802" />
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
        <section className="home-focus loading-home-hero pt-6 max-w-uv-8b89fb679d uv-v66be99e553:mt-6 flex flex-col gap-3 uv-padding-41866770f5 uv-v3bccf64584:m-0 uv-v3bccf64584:max-w-uv-c078f10a0b uv-v3bccf64584:text-uv-f903dbdb24c uv-v3bccf64584:uv-line-height-0cde346137 uv-v3bccf64584:uv-letter-spacing-22ddbb53b9 uv-v3bccf64584:uv-weight-560 uv-vca7070d208:max-w-150 min-h-51.25 uv-min940:pt-7">
          <div className="skeleton skeleton-kicker rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-3" />
          <div className="skeleton loading-hero-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-e42053aa2e h-14.5" />
          <div className="skeleton skeleton-copy rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-df68a90156 h-4.5" />
          <div className="skeleton loading-primary-action uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-69be74e670 h-12.5 rounded-uv-rd65225386d" />
        </section>
        <section className="home-metrics loading-metrics uv-border-top-8d7f82f403 uv-border-bottom-8d7f82f403 uv-v99777dc5b4:flex uv-v99777dc5b4:flex-col uv-v99777dc5b4:gap-0.5 uv-v99777dc5b4:uv-padding-01d4eda96b uv-v99777dc5b4:text-uv-text-muted uv-vdaa2fba978:uv-border-left-8d7f82f403 uv-veda02a0adb:text-uv-text grid uv-grid-template-columns-563355decf uv-border-block-8d7f82f403 uv-v32dfd54355:min-w-0 uv-v32dfd54355:min-h-18.5 uv-v32dfd54355:flex uv-v32dfd54355:flex-col uv-v32dfd54355:justify-center uv-v32dfd54355:gap-1 uv-v32dfd54355:uv-padding-6a62781f0d uv-vbc7360b113:uv-border-left-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-ff2eac39bbc uv-veda02a0adb:uv-font-variant-numeric-3032cae0ba uv-v36c0309a03:overflow-hidden uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff7862da171 uv-v36c0309a03:uv-line-height-8e007eaa50 uv-v36c0309a03:uv-text-overflow-900198081b">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton loading-metric uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17 rounded-none" key={index} />
          ))}
        </section>
        <section className="home-next-grid grid uv-grid-template-columns-6a5c4d4d49 uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-grid-template-columns-563355decf gap-2 uv-min940:gap-3">
          <div className="skeleton loading-action-row uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-19.5 rounded-uv-rd65225386d" />
          <div className="skeleton loading-action-row uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-19.5 rounded-uv-rd65225386d" />
        </section>
      </main>
    );
  }

  if (variant === "words") {
    return (
      <main className="page core-loading vocabulary-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full uv-ve9b43fefd2:flex-row uv-ve9b43fefd2:items-center uv-ve9b43fefd2:justify-between uv-ve9b43fefd2:gap-5 uv-ve9b43fefd2:pt-4.5 uv-ve9b43fefd2:pb-2.5 uv-v427d4df5e9:m-0 uv-v427d4df5e9:min-w-0 uv-v427d4df5e9:text-uv-f92222c0123 uv-v3b1ff6c754:w-auto uv-v3b1ff6c754:uv-flex-18ba0b6e31 uv-v3c1ca792ad:items-stretch uv-vce61ff6a19:gap-2 uv-v4e3567fcca:py-0.5 uv-v8d1fad19a2:gap-2.5 uv-v7a3dfd5686:pb-1 uv-v92ffc916c6:mt-0.5 uv-v92ffc916c6:border-t-uv-border-strong uv-v880449fe3c:min-h-20.5 uv-v880449fe3c:py-3.5 uv-v880449fe3c:bg-transparent uv-v880449fe3c:uv-content-visibility-0d612c12d2 uv-v880449fe3c:uv-contain-intrinsic-size-b479074074 uv-v880449fe3c:uv-transition-dd530514b0 uv-v704a476013:bg-transparent uv-v5e3a24e7cd:text-uv-f44eab8f17b uv-v5e3a24e7cd:uv-weight-650 uv-v5e3a24e7cd:uv-letter-spacing-8b899f0f19 uv-v3adb96cf0c:mt-1.25 uv-vfab421b27f:text-uv-text-soft uv-vfab421b27f:text-uv-fe9d5fd6635 uv-v6a940edaf0:min-w-19.5 uv-v6a940edaf0:gap-1.25 uv-v91aa083d31:text-uv-text-muted uv-v91aa083d31:uv-font-family-320794573f uv-v91aa083d31:text-uv-f174ef476a0 uv-v3ccf9121ca:border-uv-border-strong uv-v3ccf9121ca:bg-uv-c7ef9eb4aa9 uv-vfe7b5e7ea0:mt-0.25 uv-vfe7b5e7ea0:text-uv-text uv-vfe7b5e7ea0:text-uv-f58b84cc6f5 uv-vc89072ee13:opacity-82 uv-min620:uv-v3c1ca792ad:items-end uv-min620:uv-v880449fe3c:min-h-22 uv-min620:uv-v880449fe3c:uv-padding-c33d677ea2 uv-min940:uv-ve9b43fefd2:pt-7.5 uv-min940:uv-v880449fe3c:-mx-3 uv-min940:uv-v880449fe3c:px-3 uv-min940:uv-v880449fe3c:border-b-uv-c651b85d40c uv-min940:uv-v880449fe3c:rounded-uv-r0939007802 uv-min940:uv-v30cd3666b6:uv-z-index-356a192b79 uv-min940:uv-v30cd3666b6:border-transparent uv-min940:uv-v30cd3666b6:bg-uv-surface uv-min940:uv-v30cd3666b6:uv-transform-96bdae476f" aria-busy="true" aria-label={loading(t("vocab.title"))}>
        <section className="page-header compact library-header uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 flex flex-col uv-v3bccf64584:mb-1 uv-v3faa105aea:mb-1 uv-min620:flex-row uv-min620:items-end uv-min620:justify-between uv-min620:uv-vcded88c612:w-auto gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade max-w-none" aria-hidden="true">
          <div className="skeleton loading-vocabulary-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-16b9d6c3cb h-12" />
          <div className="skeleton loading-add-word uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-30 h-11 rounded-uv-r0939007802" />
        </section>
        <div className="skeleton loading-search uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-12 rounded-uv-rd65225386d" />
        <div className="vocabulary-controls-row flex items-center justify-between gap-2.5 uv-ve9ea81b080:uv-flex-b1519c2d12 uv-ve9ea81b080:min-w-0 uv-v82af058c60:uv-flex-18ba0b6e31" aria-hidden="true">
          <div className="loading-language-switch flex gap-0.75 p-0.75 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 uv-v56f1a99c32:w-10.75 uv-v56f1a99c32:h-9 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-v729ebd4b93:w-13.75">
            <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
            <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
            <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
          </div>
          <div className="skeleton loading-add-filter uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-28 h-11 rounded-uv-r4bd46d4017" />
        </div>
        <div className="skeleton loading-list-count rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-30 h-3.5 mt-0.5" aria-hidden="true" />
        <div className="vocabulary-list flex flex-col uv-border-top-8d7f82f403">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="vocabulary-row loading-vocabulary-row uv-v4af6d61843:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative grid uv-grid-template-columns-f06dd92ea5 uv-gap-e4accf4b2b uv-padding-9e55c755a1 uv-border-bottom-8d7f82f403 bg-transparent uv-va00727a60e:overflow-hidden uv-va00727a60e:text-uv-f2862aaf96f uv-va00727a60e:uv-line-height-8e007eaa50 uv-va00727a60e:uv-text-overflow-900198081b uv-va00727a60e:whitespace-nowrap uv-vc89072ee13:uv-grid-column-93b665dfb5 uv-vc89072ee13:h-0.75 uv-vc89072ee13:-mt-0.5 min-h-20.5 uv-v422d23500e:gap-2.25 uv-min620:min-h-21 uv-min620:px-2" key={index} aria-hidden="true">
              <div className="vocabulary-row-main skeleton-stack flex flex-col gap-3 min-w-0">
                <div className="skeleton loading-row-word rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-b523d09d0b h-5.75" />
                <div className="skeleton loading-row-translation rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-0bc6c66b27 h-3.5" />
              </div>
              <div className="skeleton loading-row-meta rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22 h-4.25" />
              <div className="skeleton loading-row-mastery uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-grid-column-93b665dfb5 h-1 rounded-uv-red9ab892c5" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (variant === "word") {
    return (
      <main className="page core-loading word-detail-page flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 w-full gap-4.5 uv-vecc81eeaa9:grid uv-vecc81eeaa9:uv-grid-template-columns-f06dd92ea5 uv-vecc81eeaa9:items-start uv-vecc81eeaa9:gap-3 uv-v36e6efe6f1:min-w-0 uv-v2182f6b997:mt-0.5 uv-vbaebb52c57:gap-1.75 uv-v6a8829b0e2:uv-min-height-e45618b383 uv-vea5dd54ed5:gap-2.5 uv-vbd9b9189fd:border-uv-border uv-vbd9b9189fd:bg-uv-surface uv-v16674328d6:mb-0.5 uv-vfe12d2c38d:text-uv-f1fba8b9d92 uv-vf3a163301c:gap-1.5 uv-v28ff1278c5:border-uv-border uv-v3c8ad4524c:min-h-37.5 uv-vb8b10c2955:text-uv-f19feeb881c uv-vb8b10c2955:uv-line-height-4693695d02 uv-vc492dfe385:uv-transition-c961432cc4 uv-min620:uv-v2182f6b997:items-start uv-min940:uv-vea5dd54ed5:uv-grid-template-columns-90de32206c uv-min940:uv-vea5dd54ed5:items-start uv-min940:uv-v42a05fcb53:uv-grid-column-93b665dfb5 uv-min940:uv-v5d6f86d820:border-uv-border-strong uv-min940:uv-v5d6f86d820:bg-uv-surface-soft uv-min940:uv-v5d6f86d820:uv-transform-4693dc4baa" aria-busy="true" aria-label={loading(t("loading.word"))}>
        <section className="page-header word-identity-hero flex flex-col uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 pt-4 relative gap-3.5 overflow-hidden p-5 uv-border-8d7f82f403 rounded-uv-r02a0a889dd uv-background-eca1ffad00 uv-v3bccf64584:max-w-uv-0927635a28 uv-v3bccf64584:text-uv-fd2f79ab33d uv-v3bccf64584:uv-line-height-cf2391bf16 uv-v3bccf64584:uv-letter-spacing-5248f40d63 uv-v3bccf64584:uv-overflow-wrap-112c2a063a uv-vca7070d208:text-uv-text-muted uv-vca7070d208:text-uv-fa2582d5d6e uv-min620:p-6.5 uv-min940:p-7.5" aria-hidden="true">
          <div className="word-detail-topline flex flex-col gap-2.5 uv-min620:flex-row uv-min620:items-center uv-min620:justify-between uv-max619:items-start uv-max619:uv-va82387843d:gap-1.25 uv-max619:uv-vcd0ef283b1:hidden">
            <div className="loading-word-badges flex flex-wrap gap-1.75 uv-v56f1a99c32:w-16.25 uv-v56f1a99c32:h-6.5 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-v2071e1fa50:w-20.5">
              <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
            </div>
            <div className="loading-language-switch loading-language-switch--word flex gap-0.75 p-0.75 uv-border-8d7f82f403 rounded-uv-r4bd46d4017 uv-v56f1a99c32:w-10.75 uv-v56f1a99c32:h-9 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-v729ebd4b93:w-10.75">
              <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" />
            </div>
          </div>
          <div className="skeleton loading-word-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-74da2e1650 uv-height-c1d2667d6d" />
          <div className="word-hero-meanings mt-1 pt-4.5 uv-border-top-8d7f82f403"><div className="skeleton loading-word-meaning rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-4cd540d85a h-7.25" /></div>
        </section>
        <nav className="word-detail-actions flex flex-wrap gap-2 uv-ve7e0cd887c:uv-flex-a5d8dbfcd5 uv-ve7e0cd887c:uv-min-height-e45618b383 uv-v922f66b8af:uv-flex-a5d8dbfcd5 uv-v922f66b8af:uv-min-height-e45618b383" aria-hidden="true">
          <div className="skeleton loading-word-action uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-flex-a5d8dbfcd5 h-11 rounded-uv-r0939007802" />
          <div className="skeleton loading-word-action uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-flex-a5d8dbfcd5 h-11 rounded-uv-r0939007802" />
        </nav>
        <section className="page-section flex flex-col gap-3" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" />
          <div className="loading-example-grid grid gap-3 uv-min700:uv-grid-template-columns-dd0b1a1848">
            <div className="skeleton loading-example-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-37.5 rounded-uv-rd65225386d" />
            <div className="skeleton loading-example-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-37.5 rounded-uv-rd65225386d" />
          </div>
        </section>
        <div className="skeleton loading-word-disclosure uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
        <div className="skeleton loading-word-disclosure uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "review") {
    return (
      <main className="page core-loading review-landing review-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-a9051779da mx-auto uv-vd132eeea1f:gap-5 uv-vd132eeea1f:p-5 uv-vd132eeea1f:uv-border-8d7f82f403 uv-vd132eeea1f:rounded-uv-r02a0a889dd uv-vd132eeea1f:uv-background-78c5b2e93a uv-v93bc46e45f:mt-1.5 uv-v93bc46e45f:text-uv-fc93d2c021e uv-ve1c0ec74c0:max-w-135 uv-v9fef326f97:min-h-13 uv-v2844d96cbb:border-uv-border-strong uv-v2844d96cbb:bg-transparent uv-v496f127096:min-h-19.5 uv-ve1c02f4141:text-uv-fab62110780 uv-ve1c02f4141:uv-letter-spacing-52201352dd uv-v73b87ee743:gap-0 uv-vdf55f3f410:min-h-17.5 uv-vdf55f3f410:uv-transition-5b1b79097a uv-v9d433574a4:uv-transform-46cefb7b73 uv-min620:uv-vd132eeea1f:p-6 uv-min940:pt-5.5 uv-min940:uv-vd132eeea1f:p-7 uv-min940:uv-v73b87ee743:grid uv-min940:uv-v73b87ee743:uv-grid-template-columns-563355decf uv-min940:uv-v73b87ee743:gap-2.5 uv-min940:uv-v73b87ee743:border-0 uv-min940:uv-vdf55f3f410:min-h-28 uv-min940:uv-vdf55f3f410:uv-grid-template-columns-51adf3fd32 uv-min940:uv-vdf55f3f410:uv-align-content-305047e96e uv-min940:uv-vdf55f3f410:p-4 min-[940px]:[&_.review-mode-list_>_a]:[border:1px_solid_var(--border)]! uv-min940:uv-vdf55f3f410:rounded-uv-r4678bd4d8a uv-min940:uv-vdf55f3f410:bg-uv-surface uv-min940:uv-vc0e46870e2:uv-grid-column-da4b9237ba uv-min940:uv-vc0e46870e2:mt-0.75 min-[940px]:[&_.review-mode-list_>_a:hover]:[border-color:var(--border-strong)]! uv-min940:uv-v83379fbed0:bg-uv-surface-raised uv-min940:uv-v83379fbed0:uv-transform-1f1d96f064" aria-busy="true" aria-label={loading(t("nav.review"))}>
        <section className="review-hero flex flex-col gap-4 uv-padding-8212d67a79 uv-v3bccf64584:uv-margin-02a5349d58 uv-v3bccf64584:text-uv-f25721588d4 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-vb497f87765:uv-margin-dd8c014387 uv-vb497f87765:max-w-150 uv-vb497f87765:text-uv-text-soft uv-vb497f87765:uv-line-height-05c248da4c uv-min620:flex-row uv-min620:items-end uv-min620:justify-between">
          <div className="skeleton-stack flex flex-col gap-3">
            <div className="skeleton loading-hero-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-e42053aa2e h-14.5" />
            <div className="skeleton skeleton-copy rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-df68a90156 h-4.5" />
          </div>
          <div className="skeleton loading-primary-action uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-69be74e670 h-12.5 rounded-uv-rd65225386d" />
        </section>
        <section className="practice-lanes review-mode-grid uv-v7d2af6c2de:relative grid uv-grid-template-columns-dd0b1a1848 gap-3" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="practice-lane loading-mode-card min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 uv-border-8d7f82f403 rounded-uv-r6d27d54c6c bg-uv-surface relative" key={index}>
              <div className="skeleton loading-count-badge uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b absolute top-3 right-3 w-6 h-6 rounded-uv-red9ab892c5" />
              <div className="skeleton loading-card-icon uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-14.5 h-14.5 rounded-uv-r157d8af993" />
              <div className="skeleton loading-card-label uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-21.5 uv-max-width-5366a74167 h-4.25 rounded-uv-rd6eb23604c" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "practice") {
    return (
      <main className="page core-loading practice-hub flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("nav.practice"))}>
        <section className="practice-lanes grid uv-grid-template-columns-dd0b1a1848 gap-3" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={"practice-lane loading-mode-card min-h-35 flex flex-col items-center justify-center gap-3 p-3.5 uv-border-8d7f82f403 rounded-uv-r6d27d54c6c bg-uv-surface relative" + (index === 0 ? " practice-lane-grammar uv-grid-column-93b665dfb5" : "")} key={index}>
              <div className="skeleton loading-card-icon uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-14.5 h-14.5 rounded-uv-r157d8af993" />
              <div className="skeleton loading-card-label uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-21.5 uv-max-width-5366a74167 h-4.25 rounded-uv-rd6eb23604c" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "writing") {
    return (
      <main className="page core-loading writing-hub flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b uv-vd57432bcf0:max-w-uv-e83c9a8a13 uv-vd57432bcf0:gap-4 uv-vd57432bcf0:p-4.5 uv-vd57432bcf0:border-uv-border-strong uv-vd57432bcf0:uv-background-21ade80306 uv-v50b16c018b:min-h-13 uv-v1506e77c3f:uv-border-top-8d7f82f403 uv-vfb6c9a8dbe:min-h-17 uv-vfb6c9a8dbe:px-1 uv-min620:uv-vd57432bcf0:p-5.5 uv-min940:pt-3 uv-min940:uv-vd57432bcf0:grid uv-min940:uv-vd57432bcf0:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-vb8771597ac:uv-grid-column-93b665dfb5 uv-min940:uv-vad477e2d1d:uv-grid-column-93b665dfb5 uv-min940:uv-v6a8e1fa92d:uv-grid-column-93b665dfb5 uv-min940:uv-v151a72fcb3:uv-grid-column-93b665dfb5" aria-busy="true" aria-label={loading(t("nav.writing"))}>
        <section className="page-header compact practice-workbench-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 uv-max-width-5a165b8e65 pt-5 uv-v3bccf64584:text-uv-fe7a9e3765c" aria-hidden="true"><div className="skeleton loading-hub-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-ce713be66c h-12.5 uv-vd24d586128:uv-width-1c53045b2d" /></section>
        <section className="panel writing-start-form loading-hub-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex-col uv-min620:uv-vae41d3c771:uv-grid-column-93b665dfb5 uv-min620:uv-ve7e0cd887c:uv-grid-column-93b665dfb5 rounded-uv-r6d27d54c6c p-3.75 grid gap-4.5 uv-v6e1e91da2a:flex uv-v6e1e91da2a:flex-col uv-min940:uv-v6e1e91da2a:grid uv-min940:uv-v6e1e91da2a:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-v32b17cd1ae:uv-grid-column-93b665dfb5" aria-hidden="true">
          <div className="writing-settings-row grid uv-grid-template-columns-dd0b1a1848 gap-3"><LoadingField name={t("writing.mode")} /><LoadingField name={t("writing.level")} /></div>
          <div className="writing-settings-row grid uv-grid-template-columns-dd0b1a1848 gap-3"><LoadingField name={t("writing.type")} /><LoadingField name={t("writing.targetLength")} /></div>
          <div className="field writing-topic-field loading-field-group uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560 uv-grid-column-93b665dfb5 flex flex-col gap-2 min-w-0"><div className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" /><div className="skeleton loading-setting-control uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-full h-12 rounded-uv-r0939007802" /></div>
          <div className="skeleton loading-form-submit uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-13c7cf3409 h-11 rounded-uv-r0939007802" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading") {
    return (
      <main className="page core-loading reading-hub generated-reading-hub flex flex-col uv---reading-measure-51f5a1cba8 gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b uv-v79f14f97ec:max-w-uv-e83c9a8a13 uv-v79f14f97ec:gap-4 uv-v79f14f97ec:p-4.5 uv-v79f14f97ec:border-uv-border-strong uv-v79f14f97ec:uv-background-21ade80306 uv-v21375cf224:min-h-13 uv-v1506e77c3f:uv-border-top-8d7f82f403 uv-vfb6c9a8dbe:min-h-17 uv-vfb6c9a8dbe:px-1 uv-min620:uv-v79f14f97ec:p-5.5 uv-min940:pt-3" aria-busy="true" aria-label={loading(t("nav.reading"))}>
        <section className="page-header compact practice-workbench-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 uv-max-width-5a165b8e65 pt-5 uv-v3bccf64584:text-uv-fe7a9e3765c" aria-hidden="true"><div className="skeleton loading-hub-title wide rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-ce713be66c h-12.5 uv-vd24d586128:uv-width-1c53045b2d" /></section>
        <section className="panel story-form reading-generation-form loading-hub-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 w-full max-w-uv-5dbc91eac8 rounded-uv-r6d27d54c6c grid gap-4.5" aria-hidden="true">
          <div className="form-grid story-settings-grid grid gap-3 uv-grid-template-columns-dd0b1a1848 uv-min620:uv-grid-template-columns-dd0b1a1848"><LoadingField name={t("reading.length")} /><LoadingField name={t("reading.grammarFocus")} /></div>
          <LoadingField name={t("reading.topic")} />
          <fieldset className="target-picker story-target-picker loading-target-picker m-0 uv-v73883af7e9:mb-2 uv-v73883af7e9:text-uv-text-soft uv-v73883af7e9:text-uv-f845cf53f3a uv-v73883af7e9:uv-weight-560 uv-v6b038101b8:uv-margin-456435724d grid gap-3 p-4 uv-border-8d7f82f403 rounded-uv-rd65225386d uv-vc660990c90:block">
            <legend><span className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" /></legend>
            <div className="story-word-search skeleton loading-setting-control uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b flex items-center gap-2.25 uv-padding-f74548ca12 uv-border-8d7f82f403 bg-uv-surface-raised text-uv-text-muted uv-vcf5ce320fa:min-h-11.5 uv-vcf5ce320fa:border-0 uv-vcf5ce320fa:p-0 uv-vcf5ce320fa:bg-transparent uv-ve65c99bcbe:border-uv-primary w-full h-12 rounded-uv-r0939007802" />
            <div className="skeleton loading-target-hint rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-e59d95676d h-3.75" />
          </fieldset>
          <div className="skeleton loading-form-submit uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-13c7cf3409 h-11 rounded-uv-r0939007802" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "speaking") {
    return (
      <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("practice.speaking"))}>
        <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade" aria-hidden="true"><div className="skeleton loading-hub-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-ce713be66c h-12.5 uv-vd24d586128:uv-width-1c53045b2d" /></section>
        <section className="panel conversation-start-form loading-hub-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex-col uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vbec331cd32:uv-grid-column-93b665dfb5 uv-min620:uv-vc6a3ba666c:uv-grid-column-93b665dfb5 uv-min620:uv-vae41d3c771:uv-grid-column-93b665dfb5 uv-min620:uv-ve7e0cd887c:uv-grid-column-93b665dfb5 rounded-uv-r6d27d54c6c grid gap-4.5 uv-v6e1e91da2a:flex uv-v6e1e91da2a:flex-col uv-min620:uv-v6e1e91da2a:grid uv-min620:uv-v6e1e91da2a:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vdb44acc009:uv-grid-column-93b665dfb5 uv-min620:uv-v4fd50aab40:uv-grid-column-93b665dfb5" aria-hidden="true">
          <LoadingField name={t("writing.mode")} />
          <LoadingField name={t("conversation.topic")} />
          <LoadingField name={t("conversation.targets")} />
          <LoadingField name={t("conversation.tone")} />
          <LoadingField name={t("conversation.formality")} />
          <div className="skeleton loading-form-submit uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-13c7cf3409 h-11 rounded-uv-r0939007802" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading-detail [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px]") {
    return (
      <main className="page core-loading generated-reading-page flex flex-col uv---reading-measure-51f5a1cba8 gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("loading.readingDetail"))}>
        <section className="page-header compact reading-document-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 max-w-uv-a9051779da uv-v3bccf64584:text-uv-fb9b4a66c9a" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-4.5" />
          <div className="loading-meta-badges flex flex-wrap gap-1.75 uv-v56f1a99c32:w-15.75 uv-v56f1a99c32:h-6.25 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-vc2042aabbf:w-21.25"><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /></div>
          <div className="skeleton loading-document-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-41d0b0c6e2 h-13" />
        </section>
        <article className="panel generated-reading-text loading-reading-document uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 uv-max-width-ff0948b971 mx-auto uv-padding-3adff930ea text-uv-fe2022883cc uv-line-height-93ec1d5b0e uv-v3696a6f5e9:uv-margin-top-03a660ae63 uv-max720:p-4.5 uv-max720:uv-line-height-3d827c0dc2 rounded-uv-r6d27d54c6c min-h-85 uv-v3aa23311a7:inline uv-v3aa23311a7:uv-padding-a03728e684 uv-v3aa23311a7:border-0 uv-v3aa23311a7:rounded-uv-r5e0d704b33 uv-v3aa23311a7:uv-background-19dd733243 uv-v3aa23311a7:text-uv-primary-strong uv-v3aa23311a7:uv-font-3e26d67509 uv-v3aa23311a7:uv-weight-680 uv-v3aa23311a7:uv-line-height-3e26d67509 uv-v3aa23311a7:cursor-pointer uv-v3aa23311a7:uv-box-decoration-break-5e0072329d uv-vf10a1b1a22:uv-background-53af3ed932 uv-vdd060a9ceb:uv-background-53af3ed932" aria-hidden="true">
          <div className="loading-reading-paragraphs grid gap-6">
            {Array.from({ length: 3 }, (_, paragraph) => (
              <div className="loading-generated-paragraphs grid gap-2.75 uv-v56f1a99c32:w-full uv-v56f1a99c32:h-3.75 uv-v8a023aef31:uv-width-1c1d4ebb4c uv-va056c95d80:uv-width-6dd6198fd9" key={paragraph}>
                {Array.from({ length: 4 }, (_, line) => <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" key={line} />)}
              </div>
            ))}
          </div>
        </article>
        <section className="panel reading-language-notes loading-reading-notes uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto uv-v40f68432a8:uv-margin-10ff753f5f uv-v40f68432a8:ps-3 uv-v40f68432a8:uv-border-inline-start-c419f9412a uv-v40f68432a8:text-uv-text-muted rounded-uv-r6d27d54c6c grid gap-3.75" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" />
          <div className="skeleton loading-scenario rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-54c91cbd56 h-4.5 uv-vee8c705a12:uv-width-ff007f032d" />
          <div className="skeleton loading-note-row uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-13 rounded-uv-r4bd46d4017" />
        </section>
        <section className="panel reading-assessment loading-reading-assessment uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c grid gap-5.5" aria-hidden="true">
          <div className="loading-reading-assessment-head grid gap-2"><div className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" /><div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" /></div>
          {Array.from({ length: 2 }, (_, index) => (
            <div className="reading-question loading-reading-question border-0 uv-border-top-8d7f82f403 uv-v73883af7e9:flex-wrap uv-v73883af7e9:uv-weight-650 grid min-w-0 gap-3.75 uv-padding-4942d7b936 uv-v73883af7e9:w-full uv-v73883af7e9:flex uv-v73883af7e9:items-start uv-v73883af7e9:gap-2.75 uv-v73883af7e9:p-0 uv-v6d5e74b2a3:border-uv-danger uv-v6d5e74b2a3:bg-uv-c8b3083dabe" key={index}>
              <div className="loading-question-heading flex items-start gap-3 uv-v422d23500e:uv-flex-356a192b79 uv-v422d23500e:gap-2.25"><div className="skeleton loading-question-number uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-8.5 h-8.5 rounded-uv-r933cc73310" /><div className="skeleton-stack flex flex-col gap-3"><div className="skeleton loading-question-type uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-25 h-5.5 rounded-uv-r9bc5fefa1a" /><div className="skeleton loading-question-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-410a7e492f h-5" /></div></div>
              <div className="reading-question-options grid uv-v586b3820a5:flex uv-v586b3820a5:gap-2.5 uv-v586b3820a5:items-start uv-v586b3820a5:uv-padding-df857c6c31 uv-v586b3820a5:uv-border-8d7f82f403 uv-v586b3820a5:rounded-uv-r0939007802 uv-v586b3820a5:cursor-pointer uv-max720:uv-v586b3820a5:p-2.75 gap-2.25">
                {Array.from({ length: 4 }, (_, option) => <div className="skeleton loading-question-option uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-13 rounded-uv-r0939007802" key={option} />)}
              </div>
            </div>
          ))}
          <div className="skeleton loading-form-submit uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-13c7cf3409 h-11 rounded-uv-r0939007802" />
        </section>
        <section className="panel reading-language-summary loading-reading-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 max-w-uv-a9051779da mx-auto rounded-uv-r6d27d54c6c grid gap-3.75" aria-hidden="true">
          <div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" />
          <div className="loading-target-chips flex flex-wrap gap-1.75 uv-v56f1a99c32:w-21.25 uv-v56f1a99c32:h-7 uv-v56f1a99c32:rounded-uv-red9ab892c5"><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /></div>
        </section>
        <section className="panel story-summary loading-reading-summary uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-vb19eb067c9:uv-line-height-cf9a155f4a rounded-uv-r6d27d54c6c grid gap-3.75" aria-hidden="true"><div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" /><div className="skeleton loading-scenario rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-54c91cbd56 h-4.5 uv-vee8c705a12:uv-width-ff007f032d" /><div className="skeleton loading-scenario short rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-54c91cbd56 h-4.5 uv-vee8c705a12:uv-width-ff007f032d" /></section>
      </main>
    );
  }

  if (variant === "conversation") {
    return (
      <main className="page core-loading conversation-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={loading(t("loading.speakingSession"))}>
        <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-4.5" />
          <div className="word-meta loading-meta-badges items-center flex flex-wrap gap-1.75 uv-v56f1a99c32:w-15.75 uv-v56f1a99c32:h-6.25 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-vc2042aabbf:w-21.25">{Array.from({ length: 5 }, (_, index) => <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" key={index} />)}</div>
          <div className="skeleton loading-document-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-41d0b0c6e2 h-13" />
          <div className="skeleton loading-scenario rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-54c91cbd56 h-4.5 uv-vee8c705a12:uv-width-ff007f032d" />
          <div className="mission-objective loading-mission-objective flex gap-2.5 uv-padding-fed09d08e0 uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface-raised uv-v872d6ea02a:uv-flex-18ba0b6e31 uv-v872d6ea02a:mt-0.5 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:uv-line-height-2792cf2449 items-center"><div className="skeleton loading-objective-icon rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-4.5 h-4.5" /><div className="skeleton-stack flex flex-col gap-3"><div className="skeleton loading-objective-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-18.75 h-3.5" /><div className="skeleton loading-objective-copy rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-8493fe019b h-3.75" /></div></div>
        </section>
        <section className="conversation-targets loading-conversation-targets overflow-x-auto pb-0.75 flex flex-wrap gap-2 uv-v56f1a99c32:w-30 uv-v56f1a99c32:h-10.75 uv-v56f1a99c32:rounded-uv-r4bd46d4017" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" key={index} />)}
        </section>
        <section className="conversation-chat loading-conversation-chat flex flex-col gap-3.5 w-full max-w-uv-a9051779da mx-auto min-h-82.5" aria-hidden="true">
          <div className="conversation-messages flex flex-col gap-4.5 uv-padding-784a5bb832 uv-min620:pb-32">
            <div className="conversation-message is-assistant loading-conversation-message uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-f174ef476a0 uv-v22810335d8:uv-weight-650 uv-v22810335d8:uppercase uv-v22810335d8:uv-letter-spacing-f49b9114de uv-v026f084606:m-0 uv-v026f084606:uv-padding-2e9fc07eac uv-v026f084606:rounded-uv-rd65225386d uv-v026f084606:uv-line-height-05c248da4c uv-v026f084606:whitespace-pre-wrap uv-v37d0b116c1:self-start uv-v8b6b40051e:uv-border-8d7f82f403 uv-v8b6b40051e:bg-uv-surface uv-ve7c06fc78f:self-end uv-v123b211084:bg-uv-primary uv-v123b211084:uv-color-528cef87d0 w-full max-w-none flex flex-row gap-2.5 uv-ve7c06fc78f:flex-row-reverse uv-ve7c06fc78f:items-start uv-v8bf3f97875:uv-border-color-1affe77f6c uv-v8bf3f97875:bg-uv-cbdfd7cd038 uv-v8bf3f97875:text-uv-primary-strong uv-v541011a805:items-end uv-vfbb80649de:border-transparent uv-vfbb80649de:rounded-uv-rb907f29c2a uv-vfbb80649de:bg-uv-primary uv-vfbb80649de:uv-color-528cef87d0 items-start"><div className="skeleton loading-avatar uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-9 h-9 rounded-uv-rb46da6ec37 uv-flex-18ba0b6e31" /><div className="skeleton loading-message uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-1726b42f86 h-14.5 rounded-uv-rd65225386d uv-vafd5f35c43:uv-width-50e23e4468" /></div>
            <div className="conversation-message is-user loading-conversation-message uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-f174ef476a0 uv-v22810335d8:uv-weight-650 uv-v22810335d8:uppercase uv-v22810335d8:uv-letter-spacing-f49b9114de uv-v026f084606:m-0 uv-v026f084606:uv-padding-2e9fc07eac uv-v026f084606:rounded-uv-rd65225386d uv-v026f084606:uv-line-height-05c248da4c uv-v026f084606:whitespace-pre-wrap uv-v37d0b116c1:self-start uv-v8b6b40051e:uv-border-8d7f82f403 uv-v8b6b40051e:bg-uv-surface uv-ve7c06fc78f:self-end uv-v123b211084:bg-uv-primary uv-v123b211084:uv-color-528cef87d0 w-full max-w-none flex flex-row gap-2.5 uv-ve7c06fc78f:flex-row-reverse uv-ve7c06fc78f:items-start uv-v8bf3f97875:uv-border-color-1affe77f6c uv-v8bf3f97875:bg-uv-cbdfd7cd038 uv-v8bf3f97875:text-uv-primary-strong uv-v541011a805:items-end uv-vfbb80649de:border-transparent uv-vfbb80649de:rounded-uv-rb907f29c2a uv-vfbb80649de:bg-uv-primary uv-vfbb80649de:uv-color-528cef87d0 items-start"><div className="skeleton loading-avatar uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-9 h-9 rounded-uv-rb46da6ec37 uv-flex-18ba0b6e31" /><div className="skeleton loading-message response uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-1726b42f86 h-14.5 rounded-uv-rd65225386d uv-vafd5f35c43:uv-width-50e23e4468" /></div>
          </div>
          <div className="conversation-composer loading-conversation-composer flex-col uv-min620:grid uv-min620:uv-grid-template-columns-f06dd92ea5 uv-min620:items-end uv-min620:uv-v3c40c23539:min-h-16 sticky uv-bottom-af4098e1ca uv-z-index-7b52009b64 uv-grid-template-columns-9ec3f125f4 uv-padding-40a2f0cf13 uv-border-488f4b382f rounded-uv-r998b02c207 uv-background-283a8f83ba uv-box-shadow-4ee177db8b uv-backdrop-filter-44b1307bc7 uv-v3c40c23539:min-h-11 uv-v3c40c23539:max-h-37.5 uv-v3c40c23539:uv-padding-766138ac4d uv-v3c40c23539:resize-none uv-v3c40c23539:border-0 uv-v3c40c23539:bg-transparent uv-v3c40c23539:uv-box-shadow-71f8e7976e uv-vfeb3f72e04:uv-box-shadow-71f8e7976e uv-min620:bottom-4.5 flex gap-2 items-end"><div className="skeleton loading-chat-input uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-flex-356a192b79 h-15 rounded-uv-r0939007802" /><div className="skeleton loading-chat-send uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-11 h-11 rounded-uv-r4bd46d4017" /></div>
        </section>
        <div className="skeleton loading-conversation-finish uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-f0491ab812 h-11 rounded-uv-r0939007802" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "writing-session") {
    return (
      <main className="page core-loading writing-session-page flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2991113b44 uv-v19f0956f17:max-w-uv-d1f4d3e141 uv-v19f0956f17:p-4.5 uv-v19f0956f17:bg-uv-surface uv-vaca0928d6e:text-uv-fbe55c92df5 uv-vaca0928d6e:uv-line-height-58e6d386c3 uv-v691ffddc27:max-w-uv-0927635a28 uv-v691ffddc27:gap-3 uv-v5143847986:uv-min-height-69924f8d09 uv-v5143847986:p-4 uv-v5143847986:border-uv-border-strong uv-v5143847986:rounded-uv-r6d27d54c6c uv-v5143847986:uv-background-4e298cec10 uv-v5143847986:text-uv-fcb7a01623a uv-v5143847986:uv-line-height-86d76fc750 uv-v642ba83c04:bg-uv-cfcbfb23a40 uv-ve70de6f77f:border-uv-border-strong uv-ve70de6f77f:uv-box-shadow-f19c4300a8 uv-vbfa1b6e621:border-uv-border-strong uv-vbfa1b6e621:rounded-uv-r6d27d54c6c uv-vbfa1b6e621:bg-uv-surface uv-v28c8916e41:min-h-18.5 uv-v28c8916e41:justify-center uv-v28c8916e41:p-3.5 uv-v0681bf294a:text-uv-f3951047c34 uv-v53390288ba:max-w-uv-d1f4d3e141 uv-v8dc5afe670:max-w-uv-d1f4d3e141 uv-vd79dd6aeee:max-w-uv-0927635a28 uv-min620:uv-v5143847986:uv-min-height-e5ba4e032a uv-min620:uv-v5143847986:p-5 uv-min940:uv-v691ffddc27:max-w-uv-2e0eb67d1b uv-min940:uv-ve70de6f77f:static uv-min940:uv-ve70de6f77f:p-0 uv-min940:uv-ve70de6f77f:border-0 uv-min940:uv-ve70de6f77f:bg-transparent uv-min940:uv-ve70de6f77f:uv-box-shadow-71f8e7976e uv-min940:uv-ve70de6f77f:uv-backdrop-filter-71f8e7976e" aria-busy="true" aria-label={loading(t("loading.writingTask"))}>
        <section className="page-header compact writing-session-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 max-w-uv-d1f4d3e141 uv-v3bccf64584:text-uv-f13caea62a0 uv-v3bccf64584:uv-line-height-e6da655eed" aria-hidden="true">
          <div className="skeleton loading-back-link rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-22.5 h-4.5" />
          <div className="word-meta loading-meta-badges items-center flex flex-wrap gap-1.75 uv-v56f1a99c32:w-15.75 uv-v56f1a99c32:h-6.25 uv-v56f1a99c32:rounded-uv-r9bc5fefa1a uv-vc2042aabbf:w-21.25">{Array.from({ length: 3 }, (_, index) => <div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" key={index} />)}</div>
          <div className="skeleton loading-document-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-41d0b0c6e2 h-13" />
        </section>
        <section className="panel writing-task loading-writing-task uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex-col uv-v465306b89e:m-0 uv-v465306b89e:whitespace-pre-wrap uv-v465306b89e:uv-font-3e26d67509 uv-v465306b89e:uv-line-height-4693695d02 uv-v465306b89e:text-uv-text-soft rounded-uv-r6d27d54c6c grid gap-3" aria-hidden="true"><div className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" /><div className="skeleton loading-task-line rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-2e1f633937 h-4.25 uv-vee8c705a12:uv-width-f69cd32127" /><div className="skeleton loading-task-line short rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-2e1f633937 h-4.25 uv-vee8c705a12:uv-width-f69cd32127" /><div className="loading-target-chips flex flex-wrap gap-1.75 uv-v56f1a99c32:w-21.25 uv-v56f1a99c32:h-7 uv-v56f1a99c32:rounded-uv-red9ab892c5"><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /><div className="skeleton rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b" /></div></section>
        <section className="writing-editor loading-writing-editor-shell flex-col uv-v3c40c23539:resize-y uv-v3c40c23539:text-uv-f19feeb881c uv-v3c40c23539:uv-line-height-cf9a155f4a uv-v3c40c23539:uv-min-height-acf4fad8b6 uv-v3c40c23539:p-3.5 grid gap-3" aria-hidden="true">
          <div className="writing-editor-heading flex flex-col gap-0.75 uv-v586b3820a5:text-uv-text uv-v586b3820a5:text-uv-fee84419642 uv-v586b3820a5:uv-weight-650 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff1713651e0"><div className="skeleton loading-setting-label rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-43fc7e2adb h-3.5" /><div className="skeleton loading-scenario rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-54c91cbd56 h-4.5 uv-vee8c705a12:uv-width-ff007f032d" /></div>
          <div className="skeleton loading-writing-editor uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-min-height-acf4fad8b6 rounded-uv-r4678bd4d8a" />
          <div className="writing-editor-footer loading-writing-footer flex-col uv-v22810335d8:text-uv-text-muted uv-v22810335d8:uv-font-family-320794573f uv-v22810335d8:text-uv-f63777cce16 uv-v60c3901c7a:text-uv-warning uv-min620:flex-row uv-min620:items-center uv-min620:justify-between sticky uv-bottom-19e81ff378 uv-z-index-1b64538924 p-2.25 uv-border-8d7f82f403 rounded-uv-r344c386330 bg-uv-c54c3fe5d99 uv-backdrop-filter-fa0b2b5363 flex items-center justify-between gap-3 uv-max380:uv-v1af1035df2:w-35 uv-min620:static uv-min620:p-0 uv-min620:border-0 uv-min620:bg-transparent uv-min620:uv-backdrop-filter-71f8e7976e"><div className="skeleton loading-word-count rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-31.25 h-3.75" /><div className="skeleton loading-form-submit uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-13c7cf3409 h-11 rounded-uv-r0939007802" /></div>
        </section>
      </main>
    );
  }

  return (
    <main className="page core-loading flex flex-col gap-3.5 uv-min620:gap-5.5 uv-min940:gap-6" aria-busy="true" aria-label={t("common.loading")}>
      <HeaderSkeleton />
      <section className="stats-grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-grid-template-columns-0cbc4f103a">
        <div className="skeleton skeleton-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-28 rounded-uv-r02a0a889dd" />
        <div className="skeleton skeleton-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-28 rounded-uv-r02a0a889dd" />
        <div className="skeleton skeleton-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-28 rounded-uv-r02a0a889dd" />
      </section>
    </main>
  );
}
