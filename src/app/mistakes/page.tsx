import Link from "next/link";
import { Brain, Layers3 } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { clusterOpenMistakes } from "@/lib/semantic/clusters";
import { MistakeResolveButton } from "./MistakeResolveButton";

export const dynamic = "force-dynamic";

function clusterTitle(types: string[], count: number) {
  const normalized = types
    .slice(0, 3)
    .map((type) => type.replaceAll("_", " ").toLowerCase())
    .join(" + ");
  return count > 1 ? normalized + " pattern" : normalized;
}

export default async function MistakesPage() {
  const user = await getCurrentUser();
  const clusters = await clusterOpenMistakes(user.id);
  const total = clusters.reduce((sum, cluster) => sum + cluster.items.length, 0);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">MISTAKE MEMORY</p>
        <h1>Recurring weaknesses</h1>
        <p className="page-description">
          Similar recurring errors are grouped semantically so practice targets patterns,
          not just individual corrections.
        </p>
        <p className="muted">{total} open mistakes · {clusters.length} patterns</p>
      </section>

      {clusters.length ? (
        <section className="mistake-cluster-list">
          {clusters.map((cluster) => {
            const primary = cluster.items[0];
            return (
              <article className="panel mistake-cluster" key={cluster.key}>
                <div className="mistake-cluster-head">
                  <div>
                    <div className="word-meta">
                      <span className="badge">
                        {cluster.items.length > 1 ? "semantic cluster" : "single pattern"}
                      </span>
                      <span className="badge">{cluster.occurrences} occurrences</span>
                    </div>
                    <h2>{clusterTitle(cluster.types, cluster.items.length)}</h2>
                  </div>
                  <Layers3 size={20} />
                </div>

                <div className="mistake-pattern-items">
                  {cluster.items.map((mistake) => (
                    <div className="mistake-pattern-row" key={mistake.id}>
                      <div className="mistake-copy">
                        <strong>{mistake.lexeme?.lemma ?? "General German"}</strong>
                        {mistake.actual ? (
                          <p><span className="muted">You wrote:</span> {mistake.actual}</p>
                        ) : null}
                        {mistake.expected ? (
                          <p><span className="muted">Expected:</span> {mistake.expected}</p>
                        ) : null}
                        {mistake.explanation ? (
                          <p className="muted">{mistake.explanation}</p>
                        ) : null}
                        <small className="muted">
                          {mistake.type.replaceAll("_", " ").toLowerCase()} · {mistake.occurrences}×
                        </small>
                      </div>

                      <MistakeResolveButton mistakeId={mistake.id} />
                    </div>
                  ))}
                </div>

                {primary.lexemeId ? (
                  <Link
                    className="button button-primary"
                    href={"/practice?lexeme=" + primary.lexemeId}
                  >
                    <Brain size={17} />
                    Practice this weakness
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <strong>No open mistake patterns.</strong>
        </div>
      )}
    </main>
  );
}
