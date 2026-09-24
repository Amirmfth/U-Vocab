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
    <main>
      <div className="hero">
        <p className="muted">MISTAKE MEMORY</p>
        <h1 style={{ fontSize: "3rem" }}>Recurring weaknesses</h1>
        <p className="muted">
          U-Vocab stores lexical mistakes so future practice can target patterns,
          not just individual failed answers.
        </p>
      </div>

      <div className="grid">
        {mistakes.map((mistake) => (
          <article className="card" key={mistake.id}>
            <small className="muted">{mistake.type}</small>
            <h2>{mistake.lexeme?.lemma ?? "General German"}</h2>
            <p>{mistake.explanation}</p>
            {mistake.actual && <p><b>You wrote:</b> {mistake.actual}</p>}
            {mistake.expected && <p><b>Expected:</b> {mistake.expected}</p>}
            <p className="muted">
              Seen {mistake.occurrences} {mistake.occurrences === 1 ? "time" : "times"}
            </p>
          </article>
        ))}
      </div>

      {!mistakes.length && (
        <p className="muted">No recurring lexical mistakes have been recorded yet.</p>
      )}
    </main>
  );
}
