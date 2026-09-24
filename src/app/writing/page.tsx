import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { WritingStartForm } from "./WritingStartForm";


export default async function WritingPage() {
  await connection();
  const user = await getCurrentUser();
  const [collections, sessions] = await Promise.all([
    db.topicPack.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.writingSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">WRITING PRACTICE</p>
        <h1>German writing exam</h1>
        <p className="page-description">
          Practice exam-style German writing with vocabulary-focused AI evaluation.
          Scores are learning signals, not official CEFR certification.
        </p>
      </section>

      <WritingStartForm
        collections={collections.map((item) => ({
          value: item.id,
          label: item.title,
        }))}
      />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent writing</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row" key={session.id}>
                <div>
                  <strong>{session.topic}</strong>
                  <span>
                    {session.mode.toLowerCase()} · {session.level} · {session.status.toLowerCase()}
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <PenLine size={22} />
          <strong>No writing attempts yet.</strong>
        </div>
      )}
    </main>
  );
}
