import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Brain } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function TopicPackLearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

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

  const candidates = pack.items.filter((item) => {
    const state = item.lexeme.userStates[0]?.state;
    return !state || !["MASTERED", "MAINTENANCE"].includes(state);
  });

  const step = Math.min(
    Math.max(Number(query.step ?? 0) || 0, 0),
    Math.max(candidates.length - 1, 0),
  );
  const current = candidates[step];

  if (!current) {
    return (
      <main className="page">
        <section className="page-header compact">
          <p className="eyebrow">PACK SESSION COMPLETE</p>
          <h1>Nothing weak or new remains.</h1>
          <p className="page-description">
            Every item in this pack is currently mastered or in maintenance.
          </p>
          <Link href={"/topic-packs/" + pack.id} className="button button-primary">
            Back to pack
          </Link>
        </section>
      </main>
    );
  }

  const translations = current.lexeme.translations.filter((translation) =>
    isTranslationVisible(user.preferredTranslation, translation.language),
  );

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href={"/topic-packs/" + pack.id} className="back-link">
          <ArrowLeft size={16} />
          {pack.title}
        </Link>
        <p className="eyebrow">PACK SESSION · {step + 1} / {candidates.length}</p>
        <h1>
          {current.lexeme.article ? current.lexeme.article + " " : ""}
          {current.lexeme.lemma}
        </h1>
        {translations.map((translation) => (
          <p
            key={translation.id}
            className={translation.language === "fa" ? "rtl page-description" : "page-description"}
          >
            {translation.text}
          </p>
        ))}
      </section>

      <section className="panel pack-session-card">
        <p className="eyebrow">WHY THIS WORD</p>
        <p>{current.rationale}</p>
        <div className="hero-actions">
          <Link
            href={"/vocabulary/" + current.lexeme.id + "/teach"}
            className="button button-primary"
          >
            <BookOpenCheck size={18} />
            Teach me
          </Link>
          <Link
            href={"/practice?lexeme=" + current.lexeme.id}
            className="button button-secondary"
          >
            <Brain size={18} />
            Practice
          </Link>
        </div>
      </section>

      <nav className="session-nav">
        {step > 0 ? (
          <Link href={"?step=" + (step - 1)} className="button button-secondary">
            <ArrowLeft size={17} />
            Previous
          </Link>
        ) : <span />}
        {step < candidates.length - 1 ? (
          <Link href={"?step=" + (step + 1)} className="button button-primary">
            Next
            <ArrowRight size={17} />
          </Link>
        ) : (
          <Link href={"/topic-packs/" + pack.id} className="button button-primary">
            Finish
          </Link>
        )}
      </nav>
    </main>
  );
}
