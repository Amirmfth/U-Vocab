import { ImportWorkspace } from "./ImportWorkspace";

export default function ImportPage() {
  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">IMPORT</p>
        <h1>Add vocabulary</h1>
        <p className="page-description">
          Preview, deduplicate, and enrich German vocabulary before it enters your library.
        </p>
      </section>

      <ImportWorkspace />
    </main>
  );
}
