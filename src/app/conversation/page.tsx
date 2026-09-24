import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ConversationStartForm } from "./ConversationStartForm";

export const dynamic = "force-dynamic";

export default async function ConversationPage() {
  const user = await getCurrentUser();
  const [collections, sessions] = await Promise.all([
    db.topicPack.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.conversationSession.findMany({
      where: { userId: user.id, kind: "PRACTICE" },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">ACTIVE USE</p>
        <h1>Conversation practice</h1>
        <p className="page-description">
          Natural German conversations designed around vocabulary you are
          currently trying to activate.
        </p>
      </section>

      <ConversationStartForm
        kind="PRACTICE"
        collections={collections.map((item) => ({
          value: item.id,
          label: item.title,
        }))}
      />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent conversations</h2>
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
                    {session.status.toLowerCase()} · {session.level}
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
