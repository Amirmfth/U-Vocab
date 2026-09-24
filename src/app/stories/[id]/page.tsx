import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { ReadStoryButton } from "./ReadStoryButton";

export const dynamic = "force-dynamic";

type StoryQuestion = {
  type: "COMPREHENSION" | "VOCABULARY";
  question: string;
  answer: string;
};

function escapeRegex(value: string) {
  const special = "\\^$.*+?()[]{}|";
  return value
    .split("")
    .map((character) => (special.includes(character) ? "\\" + character : character))
    .join("");
}

function highlightStory(
  content: string,
  targets: Array<{ lexeme: { id: string; lemma: string } }>,
): ReactNode[] {
  const sorted = [...targets].sort(
    (a, b) => b.lexeme.lemma.length - a.lexeme.lemma.length,
  );

  if (!sorted.length) return [content];

  const regex = new RegExp(
    "(?<![\\p{L}\\p{N}_])(" +
      sorted.map((target) => escapeRegex(target.lexeme.lemma)).join("|") +
      ")(?![\\p{L}\\p{N}_])",
    "giu",
  );
  const lookup = new Map(
    sorted.map((target) => [
      target.lexeme.lemma.toLocaleLowerCase("de-DE"),
      target.lexeme,
    ]),
  );

  return content.split(regex).map((part, index) => {
    const lexeme = lookup.get(part.toLocaleLowerCase("de-DE"));
    if (!lexeme) return part;

    return (
      <Link
        key={index}
        href={"/vocabulary/" + lexeme.id}
        className="story-target"
      >
        {part}
      </Link>
    );
  });
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        <div className="story-content">
          {highlightStory(story.content, story.targets)}
        </div>

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
