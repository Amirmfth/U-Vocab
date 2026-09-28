type LoadingVariant =
  | "home"
  | "words"
  | "word"
  | "review"
  | "practice"
  | "writing"
  | "writing-session"
  | "reading"
  | "reading-detail"
  | "speaking"
  | "conversation"
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

function LoadingCollection({ count = 3 }: { count?: number }) {
  return (
    <section className="page-section" aria-hidden="true">
      <div className="skeleton loading-section-heading" />
      <div className="collection-list">
        {Array.from({ length: count }, (_, index) => (
          <div className="collection-row loading-collection-row" key={index}>
            <div className="skeleton-stack">
              <div className="skeleton loading-collection-title" />
              <div className="skeleton loading-collection-meta" />
            </div>
            <div className="skeleton loading-collection-arrow" />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingField({ name }: { name?: string }) {
  return (
    <div className="field loading-field-group" aria-label={name}>
      <div className="skeleton loading-setting-label" />
      <div className="skeleton loading-setting-control" />
    </div>
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
      <main className="page core-loading vocabulary-page" aria-busy="true" aria-label="Loading Vocabulary">
        <section className="page-header compact library-header" aria-hidden="true">
          <div className="skeleton loading-vocabulary-title" />
          <div className="skeleton loading-add-word" />
        </section>
        <div className="skeleton loading-search" />
        <div className="vocabulary-controls-row" aria-hidden="true">
          <div className="loading-language-switch">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="skeleton loading-add-filter" />
        </div>
        <div className="skeleton loading-list-count" aria-hidden="true" />
        <div className="vocabulary-list">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="vocabulary-row loading-vocabulary-row" key={index} aria-hidden="true">
              <div className="vocabulary-row-main skeleton-stack">
                <div className="skeleton loading-row-word" />
                <div className="skeleton loading-row-translation" />
              </div>
              <div className="skeleton loading-row-meta" />
              <div className="skeleton loading-row-mastery" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (variant === "word") {
    return (
      <main className="page core-loading word-detail-page" aria-busy="true" aria-label="Loading word">
        <section className="page-header word-identity-hero" aria-hidden="true">
          <div className="word-detail-topline">
            <div className="loading-word-badges">
              <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
            </div>
            <div className="loading-language-switch loading-language-switch--word">
              <div className="skeleton" /><div className="skeleton" />
            </div>
          </div>
          <div className="skeleton loading-word-title" />
          <div className="word-hero-meanings"><div className="skeleton loading-word-meaning" /></div>
        </section>
        <nav className="word-detail-actions" aria-hidden="true">
          <div className="skeleton loading-word-action" />
          <div className="skeleton loading-word-action" />
        </nav>
        <section className="page-section" aria-hidden="true">
          <div className="skeleton loading-section-heading" />
          <div className="loading-example-grid">
            <div className="skeleton loading-example-card" />
            <div className="skeleton loading-example-card" />
          </div>
        </section>
        <div className="skeleton loading-word-disclosure" aria-hidden="true" />
        <div className="skeleton loading-word-disclosure" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "review") {
    return (
      <main className="page core-loading review-landing review-page" aria-busy="true" aria-label="Loading Review">
        <section className="review-hero">
          <div className="skeleton-stack">
            <div className="skeleton loading-hero-title" />
            <div className="skeleton skeleton-copy" />
          </div>
          <div className="skeleton loading-primary-action" />
        </section>
        <section className="practice-lanes review-mode-grid" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="practice-lane loading-mode-card" key={index}>
              <div className="skeleton loading-count-badge" />
              <div className="skeleton loading-card-icon" />
              <div className="skeleton loading-card-label" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "practice") {
    return (
      <main className="page core-loading practice-hub" aria-busy="true" aria-label="Loading Practice">
        <section className="practice-lanes" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={"practice-lane loading-mode-card" + (index === 0 ? " practice-lane-grammar" : "")} key={index}>
              <div className="skeleton loading-card-icon" />
              <div className="skeleton loading-card-label" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (variant === "writing") {
    return (
      <main className="page core-loading writing-hub" aria-busy="true" aria-label="Loading Writing">
        <section className="page-header compact practice-workbench-header" aria-hidden="true"><div className="skeleton loading-hub-title" /></section>
        <section className="panel writing-start-form loading-hub-form" aria-hidden="true">
          <div className="writing-settings-row"><LoadingField name="Mode" /><LoadingField name="Level" /></div>
          <div className="writing-settings-row"><LoadingField name="Writing type" /><LoadingField name="Target length" /></div>
          <div className="field writing-topic-field loading-field-group"><div className="skeleton loading-setting-label" /><div className="skeleton loading-setting-control" /></div>
          <div className="skeleton loading-form-submit" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading") {
    return (
      <main className="page core-loading reading-hub generated-reading-hub" aria-busy="true" aria-label="Loading Reading">
        <section className="page-header compact practice-workbench-header" aria-hidden="true"><div className="skeleton loading-hub-title wide" /></section>
        <section className="panel story-form reading-generation-form loading-hub-form" aria-hidden="true">
          <div className="form-grid story-settings-grid"><LoadingField name="Length" /><LoadingField name="Grammar focus" /></div>
          <LoadingField name="Topic" />
          <fieldset className="target-picker story-target-picker loading-target-picker">
            <legend><span className="skeleton loading-setting-label" /></legend>
            <div className="story-word-search skeleton loading-setting-control" />
            <div className="skeleton loading-target-hint" />
          </fieldset>
          <div className="skeleton loading-form-submit" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "speaking") {
    return (
      <main className="page core-loading" aria-busy="true" aria-label="Loading Speaking">
        <section className="page-header compact" aria-hidden="true"><div className="skeleton loading-hub-title" /></section>
        <section className="panel conversation-start-form loading-hub-form" aria-hidden="true">
          <LoadingField name="Mode" />
          <LoadingField name="Situation or topic" />
          <LoadingField name="Target lexical units" />
          <LoadingField name="Conversation tone" />
          <LoadingField name="Formality" />
          <div className="skeleton loading-form-submit" />
        </section>
        <LoadingCollection />
      </main>
    );
  }

  if (variant === "reading-detail") {
    return (
      <main className="page core-loading generated-reading-page" aria-busy="true" aria-label="Loading reading">
        <section className="page-header compact reading-document-header" aria-hidden="true">
          <div className="skeleton loading-back-link" />
          <div className="loading-meta-badges"><div className="skeleton" /><div className="skeleton" /></div>
          <div className="skeleton loading-document-title" />
        </section>
        <article className="panel generated-reading-text loading-reading-document" aria-hidden="true">
          <div className="loading-reading-paragraphs">
            {Array.from({ length: 3 }, (_, paragraph) => (
              <div className="loading-generated-paragraphs" key={paragraph}>
                {Array.from({ length: 4 }, (_, line) => <div className="skeleton" key={line} />)}
              </div>
            ))}
          </div>
        </article>
        <section className="panel reading-language-notes loading-reading-notes" aria-hidden="true">
          <div className="skeleton loading-section-heading" />
          <div className="skeleton loading-scenario" />
          <div className="skeleton loading-note-row" />
        </section>
        <section className="panel reading-assessment loading-reading-assessment" aria-hidden="true">
          <div className="loading-reading-assessment-head"><div className="skeleton loading-setting-label" /><div className="skeleton loading-section-heading" /></div>
          {Array.from({ length: 2 }, (_, index) => (
            <div className="reading-question loading-reading-question" key={index}>
              <div className="loading-question-heading"><div className="skeleton loading-question-number" /><div className="skeleton-stack"><div className="skeleton loading-question-type" /><div className="skeleton loading-question-title" /></div></div>
              <div className="reading-question-options">
                {Array.from({ length: 4 }, (_, option) => <div className="skeleton loading-question-option" key={option} />)}
              </div>
            </div>
          ))}
          <div className="skeleton loading-form-submit" />
        </section>
        <section className="panel reading-language-summary loading-reading-summary" aria-hidden="true">
          <div className="skeleton loading-section-heading" />
          <div className="loading-target-chips"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        </section>
        <section className="panel story-summary loading-reading-summary" aria-hidden="true"><div className="skeleton loading-section-heading" /><div className="skeleton loading-scenario" /><div className="skeleton loading-scenario short" /></section>
      </main>
    );
  }

  if (variant === "conversation") {
    return (
      <main className="page core-loading conversation-page" aria-busy="true" aria-label="Loading speaking session">
        <section className="page-header compact" aria-hidden="true">
          <div className="skeleton loading-back-link" />
          <div className="word-meta loading-meta-badges">{Array.from({ length: 5 }, (_, index) => <div className="skeleton" key={index} />)}</div>
          <div className="skeleton loading-document-title" />
          <div className="skeleton loading-scenario" />
          <div className="mission-objective loading-mission-objective"><div className="skeleton loading-objective-icon" /><div className="skeleton-stack"><div className="skeleton loading-objective-label" /><div className="skeleton loading-objective-copy" /></div></div>
        </section>
        <section className="conversation-targets loading-conversation-targets" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => <div className="skeleton" key={index} />)}
        </section>
        <section className="conversation-chat loading-conversation-chat" aria-hidden="true">
          <div className="conversation-messages">
            <div className="conversation-message is-assistant loading-conversation-message"><div className="skeleton loading-avatar" /><div className="skeleton loading-message" /></div>
            <div className="conversation-message is-user loading-conversation-message"><div className="skeleton loading-avatar" /><div className="skeleton loading-message response" /></div>
          </div>
          <div className="conversation-composer loading-conversation-composer"><div className="skeleton loading-chat-input" /><div className="skeleton loading-chat-send" /></div>
        </section>
        <div className="skeleton loading-conversation-finish" aria-hidden="true" />
      </main>
    );
  }

  if (variant === "writing-session") {
    return (
      <main className="page core-loading writing-session-page" aria-busy="true" aria-label="Loading writing task">
        <section className="page-header compact writing-session-header" aria-hidden="true">
          <div className="skeleton loading-back-link" />
          <div className="word-meta loading-meta-badges">{Array.from({ length: 3 }, (_, index) => <div className="skeleton" key={index} />)}</div>
          <div className="skeleton loading-document-title" />
        </section>
        <section className="panel writing-task loading-writing-task" aria-hidden="true"><div className="skeleton loading-setting-label" /><div className="skeleton loading-task-line" /><div className="skeleton loading-task-line short" /><div className="loading-target-chips"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></section>
        <section className="writing-editor loading-writing-editor-shell" aria-hidden="true">
          <div className="writing-editor-heading"><div className="skeleton loading-setting-label" /><div className="skeleton loading-scenario" /></div>
          <div className="skeleton loading-writing-editor" />
          <div className="writing-editor-footer loading-writing-footer"><div className="skeleton loading-word-count" /><div className="skeleton loading-form-submit" /></div>
        </section>
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
