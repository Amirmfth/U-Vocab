import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { ReadStoryButton } from "./ReadStoryButton";
import { StoryTargetReader } from "./StoryTargetReader";


type StoryQuestion = {
  type: "COMPREHENSION" | "VOCABULARY";
  question: string;
  answer: string;
};

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);

  const story = await db.story.findFirst({
    where: { id, userId: user.id },
    include: {
      targets: {
        orderBy: { position: "asc" },
        include: {
          lexeme: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  });

  if (!story) notFound();

  const questions = story.questions as unknown as StoryQuestion[];

  return (
    <main className="page">
      <section className="page-header compact">
        <Link href="/stories" className="back-link">
          <ArrowLeft size={16} />
          Stories
        </Link>
        <div className="word-meta">
          <span className="badge">{story.level}</span>
          <span className="badge">{story.length}</span>
          <span className="badge">{story.targets.length} target words</span>
        </div>
        <h1>{story.title}</h1>
        {story.topic ? (
          <p className="page-description">{story.topic}</p>
        ) : null}
      </section>

      <article className="panel story-reader">
        <StoryTargetReader
          content={story.content}
          targets={story.targets}
          translationPreference={user.preferredTranslation}
        />

        <ReadStoryButton storyId={story.id} />
      </article>

      <section className="panel">
        <h2 className="section-title">Target words</h2>

        <div className="relation-list">
          {story.targets.map((target) => (
            <Link
              href={"/vocabulary/" + target.lexeme.id}
              className="relation-chip"
              key={target.id}
            >
              <span>{target.lexeme.lemma}</span>
              {target.lexeme.translations
                .filter((item) =>
                  isTranslationVisible(user.preferredTranslation, item.language),
                )
                .map((item) => (
                  <small
                    key={item.id}
                    className={item.language === "fa" ? "rtl" : undefined}
                  >
                    {item.text}
                  </small>
                ))}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Questions</h2>

        <div className="question-list">
          {questions.map((question, index) => (
            <details className="question-item" key={index}>
              <summary>
                <span className="badge">{question.type}</span>
                {question.question}
              </summary>
              <p>{question.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="panel story-summary">
        <h2 className="section-title">Summary</h2>
        {user.preferredTranslation !== "PERSIAN" && story.englishSummary ? (
          <p>{story.englishSummary}</p>
        ) : null}
        {user.preferredTranslation !== "ENGLISH" && story.persianSummary ? (
          <p className="rtl">{story.persianSummary}</p>
        ) : null}
      </section>
    </main>
  );
}
