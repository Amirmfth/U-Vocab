export default function GrammarLoading() {
  return (
    <main className="page grammar-hub flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 gap-4.5">
      <div className="skeleton loading-home-hero rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b min-h-51.25" />
      <div className="grammar-summary grid uv-grid-template-columns-dd0b1a1848 overflow-hidden uv-border-8d7f82f403 rounded-uv-r4678bd4d8a bg-uv-surface uv-vcbb57f4d35:min-h-18 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:justify-center uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:uv-padding-611e03324b uv-v0f841b75f7:uv-border-left-8d7f82f403 uv-v21edbb0ef8:uv-border-top-8d7f82f403 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f081acf2896 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff7862da171 uv-min620:uv-grid-template-columns-0cbc4f103a uv-min620:uv-v21edbb0ef8:uv-border-top-b6589fc6ab uv-min620:uv-v5007062a75:uv-border-left-8d7f82f403">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton loading-metric uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17 rounded-none" key={index} />
        ))}
      </div>
      <div className="skeleton-stack flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton loading-action-row uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-19.5 rounded-uv-rd65225386d" key={index} />
        ))}
      </div>
    </main>
  );
}
