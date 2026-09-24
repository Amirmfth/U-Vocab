import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { StoryForm } from "./StoryForm";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const user = await getCurrentUser();
  const [stories, vocabulary] = await Promise.all([
    db.story.findMany({
      where: { userId: user.id },
      include: { _count: { select: { targets: true } } },
      orderBy: { createdAt: "desc" }, take: 30,
    }),
    db.userVocabulary.findMany({
      where: { userId: user.id }, include: { lexeme: true },
      orderBy: [{ production: "asc" }, { contextualUsage: "asc" }, { addedAt: "desc" }],
      take: 20,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact"><h1>Stories</h1></section>

      <StoryForm
        defaultLevel={user.targetLevel}
        targets={vocabulary.map((item) => ({
          lexemeId: item.lexemeId,
          label: item.lexeme.article ? item.lexeme.article + " " + item.lexeme.lemma : item.lexeme.lemma,
          state: item.state,
        }))}
      />

      <section className="page-section">
        <h2 className="section-title">Saved</h2>
        {stories.length ? (
          <div className="collection-list">
            {stories.map((story) => (
              <Link className="collection-row" href={"/stories/" + story.id} key={story.id}>
                <div>
                  <strong>{story.title}</strong>
                  <span>{story.level} · {story.length.toLowerCase()} · {story._count.targets} target words</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty"><BookOpenText size={22} /><strong>No saved stories</strong></div>
        )}
      </section>
    </main>
  );
}
