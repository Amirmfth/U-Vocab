export default function GrammarLoading() {
  return (
    <main className="page grammar-hub">
      <div className="skeleton loading-home-hero" />
      <div className="grammar-summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton loading-metric" key={index} />
        ))}
      </div>
      <div className="skeleton-stack">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton loading-action-row" key={index} />
        ))}
      </div>
    </main>
  );
}
