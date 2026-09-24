import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { TopicPackForm } from "./TopicPackForm";


export default async function TopicPacksPage() {
  await connection();
  const user = await getCurrentUser();
  const packs = await db.topicPack.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <main className="page">
      <section className="page-header compact"><h1>Topic packs</h1></section>

      <TopicPackForm defaultLevel={user.targetLevel} />

      <section className="page-section">
        <h2 className="section-title">Saved</h2>
        {packs.length ? (
          <div className="collection-list">
            {packs.map((pack) => (
              <Link className="collection-row" href={"/topic-packs/" + pack.id} key={pack.id}>
                <div>
                  <strong>{pack.title}</strong>
                  <span>{pack.level} · {pack._count.items} words</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty"><Layers3 size={22} /><strong>No saved packs</strong></div>
        )}
      </section>
    </main>
  );
}
