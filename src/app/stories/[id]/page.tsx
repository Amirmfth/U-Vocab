import Link from "next/link";
import { ArrowLeft, BookOpenText, HelpCircle } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ReadStoryButton } from "./ReadStoryButton";

export const dynamic = "force-dynamic";

type StoryQuestion = {
  type: "COMPREHENSION" | "VOCABULARY";
  question: string;
  answer: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$()|[\\]\\]/g, "\\$&");
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
    "(" + sorted.map((target) => escapeRegex(target.lexeme.lemma)).join("|") + ")",
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">GERMAN READING</p>
            <h2>Story</h2>
          </div>
          <BookOpenText size={20} />
        </div>

        <div className="story-content">
          {highlightStory(story.content, story.targets)}
        </div>

        <p className="form-help">
          Highlighted target vocabulary opens its lexical detail page.
        </p>

        <ReadStoryButton storyId={story.id} />
      </article>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TARGET VOCABULARY</p>
            <h2>Words in this story</h2>
          </div>
          <BookOpenText size={20} />
        </div>

        <div className="relation-list">
          {story.targets.map((target) => (
            <Link
              href={"/vocabulary/" + target.lexeme.id}
              className="relation-chip"
              key={target.id}
            >
              <span>{target.lexeme.lemma}</span>
              <small>
                {target.lexeme.translations.find((item) =>
                  user.preferredTranslation === "PERSIAN"
                    ? item.language === "fa"
                    : item.language === "en",
                )?.text ?? "Open details"}
              </small>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">POST-READING</p>
            <h2>Check your understanding</h2>
          </div>
          <HelpCircle size={20} />
        </div>

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
        <p className="eyebrow">SUMMARY</p>
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
