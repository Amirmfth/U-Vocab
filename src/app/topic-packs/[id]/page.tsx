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

export default async function TopicPackDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const pack = await db.topicPack.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          lexeme: {
            include: {
              translations: true,
              userStates: { where: { userId: user.id }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!pack) notFound();

  const newCount = pack.items.filter((item) => !item.lexeme.userStates[0]).length;
  const learningCount = pack.items.filter((item) => {
    const state = item.lexeme.userStates[0]?.state;
    return state && !["MASTERED", "MAINTENANCE"].includes(state);
  }).length;

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href="/topic-packs" className="back-link">
          <ArrowLeft size={16} />
          Topic packs
        </Link>
        <div className="word-meta">
          <span className="badge">{pack.level}</span>
          <span className="badge">{pack.items.length} items</span>
          <span className="badge">{newCount} new</span>
          <span className="badge">{learningCount} learning</span>
        </div>
        <h1>{pack.title}</h1>
        <p className="page-description">{pack.description}</p>
      </section>

      <section className="pack-toolbar panel">
        <PackActions packId={pack.id} />
        <form action={launchPackSession}>
          <input type="hidden" name="packId" value={pack.id} />
          <ActionButton pendingLabel="Starting session…">
            <Play size={18} />
            Start pack session
          </ActionButton>
        </form>
      </section>

      <section className="pack-list">
        {pack.items.map((item, index) => {
          const state = item.lexeme.userStates[0]?.state ?? "NEW";
          const translations = item.lexeme.translations.filter((translation) =>
            isTranslationVisible(user.preferredTranslation, translation.language),
          );

          return (
            <article className="panel pack-item" key={item.id}>
              <div className="pack-item-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="pack-item-copy">
                <div className="word-meta">
                  <span className="badge">{item.lexeme.partOfSpeech}</span>
                  <span className="badge">{state}</span>
                  <span className="badge">usefulness {item.usefulness}/5</span>
                </div>
                <h2>
                  {item.lexeme.article ? item.lexeme.article + " " : ""}
                  {item.lexeme.lemma}
                </h2>
                {translations.map((translation) => (
                  <p
                    key={translation.id}
                    className={translation.language === "fa" ? "rtl muted" : "muted"}
                  >
                    {translation.text}
                  </p>
                ))}
                {item.rationale ? <small className="muted">{item.rationale}</small> : null}
              </div>

              <div className="pack-item-controls">
                {item.lexeme.userStates[0] ? (
                  <Link
                    href={"/vocabulary/" + item.lexeme.id}
                    className="button button-secondary"
                  >
                    Open <ArrowRight size={16} />
                  </Link>
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
