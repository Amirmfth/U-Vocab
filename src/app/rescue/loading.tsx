export default function Loading() {
  return (
    <main className="page core-loading" aria-busy="true" aria-label="Loading rescue words">
      <section className="page-header compact rescue-loading-header" aria-hidden="true">
        <div className="skeleton loading-rescue-back" />
        <div className="skeleton loading-rescue-title" />
      </section>

      <section className="rescue-list" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="rescue-row" key={index}>
            <div className="skeleton loading-rescue-rank" />
            <div className="rescue-row-copy">
              <div className="skeleton loading-rescue-word" />
              <div className="skeleton loading-rescue-retrievability" />
              <div className="skeleton loading-rescue-reason" />
            </div>
            <div className="skeleton loading-rescue-score" />
          </div>
        ))}
      </section>

      <div className="progress-actions" aria-hidden="true">
        <div className="skeleton loading-rescue-action" />
        <div className="skeleton loading-rescue-action secondary" />
      </div>
    </main>
  );
}
