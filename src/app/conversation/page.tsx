import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ConversationStartForm } from "./ConversationStartForm";


export default async function ConversationPage({ searchParams }: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await connection();
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const sessions = await db.conversationSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <h1>Speaking practice</h1>
      </section>

      <ConversationStartForm initialMode={params.mode === "MISSION" ? "MISSION" : "PRACTICE"} />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent speaking sessions</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link
                href={"/conversation/" + session.id}
                className="collection-row"
                key={session.id}
              >
                <div>
                  <strong>{session.title}</strong>
                  <span>
                    {session.kind === "MISSION" ? "mission" : "conversation"} · {session.status.toLowerCase()} · {session.level}
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <MessageCircle size={21} />
          <strong>No conversation history yet.</strong>
        </div>
      )}
    </main>
  );
}
