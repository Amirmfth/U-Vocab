export function RouteLoading({
  variant = "cards",
}: {
  variant?: "cards" | "list" | "detail" | "session";
}) {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <section className="page-header compact">
        <div className="skeleton skeleton-kicker" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
      </section>

      {variant === "list" ? (
        <div className="vocabulary-list skeleton-list">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton skeleton-card" key={index} />
          ))}
        </div>
      ) : variant === "detail" ? (
        <>
          <section className="word-detail-grid">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </section>
          <div className="skeleton skeleton-card" />
        </>
      ) : variant === "session" ? (
        <section className="panel">
          <div className="skeleton-stack">
            <div className="skeleton skeleton-copy" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-card" />
          </div>
        </section>
      ) : (
        <section className="stats-grid">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </section>
      )}
    </main>
  );
}
