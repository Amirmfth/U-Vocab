import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const now = new Date();

  const [total, due, weakProduction, mistakes] = await Promise.all([
    db.userVocabulary.count({ where: { userId: user.id } }),
    db.userVocabulary.count({
      where: {
        userId: user.id,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    }),
    db.userVocabulary.count({
      where: { userId: user.id, production: { lt: 0.4 } },
    }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
  ]);

  return (
    <main>
      <section className="hero">
        <p className="muted">PERSONAL GERMAN VOCABULARY</p>
        <h1>Learn words as a connected language system.</h1>
        <p className="muted">
          Your vocabulary database now drives review scheduling, active production,
          and recurring mistake tracking.
        </p>
        <div className="toolbar">
          <Link className="button" href="/review">Review {due} due</Link>
          <Link className="button secondary" href="/practice">Practice production</Link>
          <Link href="/vocabulary/new">Add a lexical unit →</Link>
        </div>
      </section>

      <section className="grid">
        <div className="card"><b>{total}</b><p className="muted">Lexical units</p></div>
        <div className="card"><b>{due}</b><p className="muted">Due for FSRS review</p></div>
        <div className="card"><b>{weakProduction}</b><p className="muted">Need production practice</p></div>
        <div className="card"><b>{mistakes}</b><p className="muted">Open mistake patterns</p></div>
      </section>
    </main>
  );
}
