import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { TopicPackForm } from "./TopicPackForm";

export const dynamic = "force-dynamic";

export default async function TopicPacksPage() {
  const user = await getCurrentUser();
  const packs = await db.topicPack.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">AI TOPIC VOCABULARY</p>
        <h1>Topic packs</h1>
        <p className="page-description">
          Build focused German lexical collections for situations you actually
          need, with English and Persian meanings and learner-state awareness.
        </p>
      </section>

      <TopicPackForm defaultLevel={user.targetLevel} />

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SAVED PACKS</p>
            <h2>Your collections</h2>
          </div>
          <Layers3 size={20} />
        </div>

        {packs.length ? (
          <div className="grid">
            {packs.map((pack) => (
              <Link className="card pack-card" href={"/topic-packs/" + pack.id} key={pack.id}>
                <div className="word-meta">
                  <span className="badge">{pack.level}</span>
                  <span className="badge">{pack._count.items} items</span>
                </div>
                <h3>{pack.title}</h3>
                <p className="muted">{pack.description}</p>
                <span className="text-link">
                  Open pack <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Layers3 size={22} />
            <strong>No saved topic packs yet.</strong>
            <span>Generate one above to create your first focused collection.</span>
          </div>
        )}
      </section>
    </main>
  );
}
