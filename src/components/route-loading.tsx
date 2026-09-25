type LoadingVariant =
  | "home"
  | "words"
  | "word"
  | "review"
  | "practice"
  | "writing"
  | "reading"
  | "cards";

function HeaderSkeleton({ compact = true }: { compact?: boolean }) {
  return (
    <section className={"page-header " + (compact ? "compact" : "")}>
      <div className="skeleton skeleton-kicker" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
    </section>
  );
}

export function RouteLoading({
  variant = "cards",
}: {
  variant?: LoadingVariant;
}) {
  if (variant === "home") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Home">
        <section className="home-focus loading-home-hero">
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton loading-hero-title" />
          <div className="skeleton skeleton-copy" />
          <div className="skeleton loading-primary-action" />
        </section>
        <section className="home-metrics loading-metrics">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton loading-metric" key={index} />
          ))}
        </section>
        <section className="home-next-grid">
          <div className="skeleton loading-action-row" />
          <div className="skeleton loading-action-row" />
        </section>
      </main>
    );
  }

  if (variant === "words") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Words">
        <HeaderSkeleton />
        <div className="skeleton loading-search" />
        <div className="loading-chip-row">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="skeleton loading-chip" key={index} />
          ))}
        </div>
        <div className="vocabulary-list skeleton-list">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="skeleton loading-word-row" key={index} />
          ))}
        </div>
      </main>
    );
  }

  if (variant === "word") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading word">
        <HeaderSkeleton compact={false} />
        <div className="skeleton loading-primary-action" />
        <section className="word-detail-grid">
          <div className="skeleton loading-detail-panel" />
          <div className="skeleton loading-detail-panel" />
          <div className="skeleton loading-detail-panel short" />
        </section>
        <div className="skeleton loading-detail-panel" />
      </main>
    );
  }

  if (variant === "review") {
    return (
      <main className="page core-loading review-landing" aria-busy="true" aria-label="Loading Review">
        <section className="review-hero">
          <div className="skeleton-stack">
            <div className="skeleton skeleton-kicker" />
            <div className="skeleton loading-hero-title" />
            <div className="skeleton skeleton-copy" />
          </div>
          <div className="skeleton loading-primary-action" />
        </section>
        <section className="review-queue-summary loading-metrics">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton loading-metric" key={index} />
          ))}
        </section>
        <div className="skeleton loading-action-row" />
        <div className="skeleton loading-action-row" />
      </main>
    );
  }

  if (variant === "practice") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Practice">
        <HeaderSkeleton />
        <section className="practice-lanes">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="skeleton loading-practice-lane" key={index} />
          ))}
        </section>
        <div className="skeleton loading-shortcut-panel" />
      </main>
    );
  }

  if (variant === "writing") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Writing">
        <HeaderSkeleton />
        <section className="panel loading-form-panel">
          <div className="loading-form-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="skeleton loading-field" key={index} />
            ))}
          </div>
          <div className="skeleton loading-field wide" />
          <div className="skeleton loading-primary-action" />
        </section>
      </main>
    );
  }

  if (variant === "reading") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Reading">
        <HeaderSkeleton />
        <section className="panel loading-reading-panel">
          <div className="skeleton loading-field" />
          <div className="skeleton loading-textarea" />
          <div className="skeleton loading-primary-action" />
        </section>
        <div className="skeleton loading-action-row" />
      </main>
    );
  }

  return (
    <main className="page core-loading" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <section className="stats-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </section>
    </main>
  );
}
