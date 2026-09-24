export default function Loading() {
  return (
    <main className="page">
      <div className="skeleton-stack">
        <div className="skeleton skeleton-kicker" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
      </div>
      <div className="stats-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </main>
  );
}
