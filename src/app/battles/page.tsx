import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { BattleStartForm } from "./BattleStartForm";

export const dynamic = "force-dynamic";

export default async function BattlesPage() {
  const user = await getCurrentUser();
  const sessions = await db.battleSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">1–3 MINUTE PRACTICE</p>
        <h1>Vocabulary Battles</h1>
        <p className="page-description">
          Fast challenges generated from your own German vocabulary, patterns,
          relationships, and weak areas. Every answer remains a real learning signal.
        </p>
      </section>

      <BattleStartForm />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent battles</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link
                href={"/battles/" + session.id}
                className="collection-row"
                key={session.id}
              >
                <div>
                  <strong>{session.game.replaceAll("_", " ").toLowerCase()}</strong>
                  <span>
                    {session.score} pts · {session.correct}/{session.total} correct
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <Swords size={22} />
          <strong>No battles yet.</strong>
        </div>
      )}
    </main>
  );
}
