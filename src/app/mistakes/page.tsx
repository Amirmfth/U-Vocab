import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const user = await getCurrentUser();
  const mistakes = await db.mistake.findMany({
    where: { userId: user.id, resolvedAt: null },
    include: { lexeme: true },
    orderBy: [{ occurrences: "desc" }, { lastOccurredAt: "desc" }],
    take: 100,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <h1>Mistakes</h1>
        <p className="muted">{mistakes.length} open</p>
      </section>

      {mistakes.length ? (
        <div className="mistake-list">
          {mistakes.map((mistake) => (
            <article className="mistake-row" key={mistake.id}>
              <div className="mistake-copy">
                <div className="word-meta">
                  <span className="badge">{mistake.type.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="muted">{mistake.occurrences}×</span>
                </div>
                <h2>{mistake.lexeme?.lemma ?? "General German"}</h2>
                {mistake.actual ? <p><span className="muted">You wrote:</span> {mistake.actual}</p> : null}
                {mistake.expected ? <p><span className="muted">Expected:</span> <strong>{mistake.expected}</strong></p> : null}
                {mistake.explanation ? <p className="muted">{mistake.explanation}</p> : null}
              </div>
              {mistake.lexemeId ? (
                <Link className="button button-secondary" href={"/practice?lexeme=" + mistake.lexemeId}>Practice</Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty"><strong>No open mistakes</strong></div>
      )}
    </main>
  );
}
