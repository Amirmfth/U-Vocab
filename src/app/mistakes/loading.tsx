export default function Loading() {
  return (
    <main className="page core-loading" aria-busy="true" aria-label="Loading recurring weaknesses">
      <section className="page-header compact" aria-hidden="true">
        <div className="skeleton loading-mistakes-title" />
        <div className="skeleton loading-mistakes-count" />
        <div className="skeleton loading-mistakes-refresh" />
      </section>

      <section className="mistake-cluster-list" aria-hidden="true">
        <div className="loading-mistakes-heading">
          <div className="skeleton loading-mistakes-kicker" />
          <div className="skeleton loading-mistakes-subtitle" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <article className="panel mistake-cluster" key={index}>
            <div className="mistake-cluster-head">
              <div className="loading-mistakes-heading">
                <div className="loading-mistakes-badges">
                  <div className="skeleton" /><div className="skeleton" />
                </div>
                <div className="skeleton loading-mistakes-cluster-title" />
              </div>
              <div className="skeleton loading-mistakes-icon" />
            </div>
            <div className="mistake-pattern-items">
              {Array.from({ length: 2 }, (_, row) => (
                <div className="mistake-pattern-row" key={row}>
                  <div className="loading-mistakes-copy">
                    <div className="skeleton" />
                    <div className="skeleton" />
                  </div>
                  <div className="skeleton loading-mistakes-resolve" />
                </div>
              ))}
            </div>
            <div className="skeleton loading-mistakes-practice" />
          </article>
        ))}
      </section>
    </main>
  );
}
