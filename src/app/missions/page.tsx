import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ConversationStartForm } from "@/app/conversation/ConversationStartForm";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  const [collections, missions] = await Promise.all([
    db.topicPack.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.conversationSession.findMany({
      where: { userId: user.id, kind: "MISSION" },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">SECRET OBJECTIVES</p>
        <h1>Vocabulary missions</h1>
        <p className="page-description">
          Complete a real conversational objective while naturally activating
          target German vocabulary.
        </p>
      </section>

      <ConversationStartForm
        kind="MISSION"
        collections={collections.map((item) => ({
          value: item.id,
          label: item.title,
        }))}
      />

      {missions.length ? (
        <section className="page-section">
          <h2 className="section-title">Mission history</h2>
          <div className="collection-list">
            {missions.map((mission) => (
              <Link
                href={"/conversation/" + mission.id}
                className="collection-row"
                key={mission.id}
              >
                <div>
                  <strong>{mission.title}</strong>
                  <span>
                    {mission.status.toLowerCase()} · {mission.level}
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <Target size={21} />
          <strong>No missions yet.</strong>
        </div>
      )}
    </main>
  );
}
