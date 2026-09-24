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
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.userVocabulary.findMany({
      where: { userId: user.id },
      include: { lexeme: true },
      orderBy: [
        { production: "asc" },
        { contextualUsage: "asc" },
        { addedAt: "desc" },
      ],
      take: 20,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">CONTEXTUAL READING</p>
        <h1>AI stories</h1>
        <p className="page-description">
          Turn weak and learning vocabulary into natural German reading material
          with comprehension and vocabulary questions.
        </p>
      </section>

      <StoryForm
        defaultLevel={user.targetLevel}
        targets={vocabulary.map((item) => ({
          lexemeId: item.lexemeId,
          label: item.lexeme.article
            ? item.lexeme.article + " " + item.lexeme.lemma
            : item.lexeme.lemma,
          state: item.state,
        }))}
      />

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIBRARY</p>
            <h2>Saved stories</h2>
          </div>
          <BookOpenText size={20} />
        </div>

        {stories.length ? (
          <div className="grid">
            {stories.map((story) => (
              <Link className="card story-card" href={"/stories/" + story.id} key={story.id}>
                <div className="word-meta">
                  <span className="badge">{story.level}</span>
                  <span className="badge">{story.length}</span>
                  <span className="badge">{story._count.targets} targets</span>
                </div>
                <h3>{story.title}</h3>
                {story.topic ? <p className="muted">{story.topic}</p> : null}
                <span className="text-link">
                  Read story <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpenText size={22} />
            <strong>No generated stories yet.</strong>
            <span>Create one above from your current learning vocabulary.</span>
          </div>
        )}
      </section>
    </main>
  );
}
