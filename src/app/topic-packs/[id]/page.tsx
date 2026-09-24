import Link from "next/link";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { launchPackSession } from "../actions";
import { PackActions } from "./PackActions";
import { PackItemActions } from "./PackItemActions";

export const dynamic = "force-dynamic";

export default async function TopicPackDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const pack = await db.topicPack.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { lexeme: { include: { translations: true, userStates: { where: { userId: user.id }, take: 1 } } } },
      },
    },
  });

  if (!pack) notFound();
  const newCount = pack.items.filter((item) => !item.lexeme.userStates[0]).length;

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href="/topic-packs" className="back-link"><ArrowLeft size={16} />Topic packs</Link>
        <h1>{pack.title}</h1>
        <p className="muted">{pack.level} · {pack.items.length} words · {newCount} new</p>
      </section>

      <section className="pack-toolbar">
        <form action={launchPackSession}>
          <input type="hidden" name="packId" value={pack.id} />
          <ActionButton pendingLabel="Starting…"><Play size={18} />Start session</ActionButton>
        </form>
        <PackActions packId={pack.id} />
      </section>

      <section className="pack-list">
        {pack.items.map((item) => {
          const state = item.lexeme.userStates[0]?.state ?? "NEW";
          const translations = item.lexeme.translations.filter((translation) =>
            isTranslationVisible(user.preferredTranslation, translation.language));
          return (
            <article className="pack-row" key={item.id}>
              <div className="pack-item-copy">
                <div className="word-meta">
                  <span className="badge">{item.lexeme.partOfSpeech}</span>
                  <span className="badge">{state.toLowerCase()}</span>
                </div>
                <h2>{item.lexeme.article ? item.lexeme.article + " " : ""}{item.lexeme.lemma}</h2>
                <div className="translation-line">
                  {translations.map((translation) => (
                    <span key={translation.id} className={translation.language === "fa" ? "rtl" : undefined}>{translation.text}</span>
                  ))}
                </div>
              </div>
              <div className="pack-item-controls">
                {item.lexeme.userStates[0] ? (
                  <Link href={"/vocabulary/" + item.lexeme.id} className="button button-secondary">Open <ArrowRight size={16} /></Link>
                ) : null}
                <PackItemActions itemId={item.id} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
