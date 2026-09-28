import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Brain,
  CircleAlert,
  Layers3,
  Sparkles,
} from "lucide-react";
import type { GrammarCategory } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  grammarStatusLabel,
  type GrammarStatusCode,
} from "@/lib/grammar/learner-policy";
import { getVocabularyForGrammarConcept } from "@/lib/grammar/related-vocabulary";
import { startGrammarConceptAction } from "../actions";
import { grammarLessonSchema } from "@/lib/ai/grammar-lesson";
import { GrammarLessonContent } from "./GrammarLessonContent";
import { TeachGrammarSheet } from "./TeachGrammarSheet";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function categoryLabel(category: GrammarCategory) {
  return category.replaceAll("_", " ").toLowerCase();
}

function watchFor(category: GrammarCategory) {
  switch (category) {
    case "CASES":
      return "Check what controls the case: the verb, preposition, or role of the noun phrase. Do not choose an ending from meaning alone.";
    case "PREPOSITIONS":
      return "Learn the preposition together with its case or lexical pattern. Similar English translations can hide different German government.";
    case "SENTENCE_STRUCTURE":
    case "CONJUNCTIONS":
    case "RELATIVE_CLAUSES":
      return "Track the finite verb first. Many word-order mistakes come from applying main-clause order inside a dependent clause.";
    case "ADJECTIVES":
      return "Determine article type, gender/number, and case before choosing the adjective ending.";
    case "TENSES":
    case "VERBS":
      return "Separate the verb's lexical form from the tense or clause pattern that determines its surface form.";
    default:
      return "Focus on the structural cue that triggers this pattern, then compare it with the nearest contrasting form.";
  }
}

function dimensionLabel(score: number) {
  if (score >= 0.8) return "strong evidence";
  if (score >= 0.55) return "developing";
  if (score > 0) return "needs work";
  return "not demonstrated";
}

export default async function GrammarConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const user = await getCurrentUser();

  const concept = await db.grammarConcept.findFirst({
    where: { slug, language: "de", active: true },
    include: {
      parent: { select: { slug: true, title: true } },
      children: {
        where: { active: true },
        select: { slug: true, title: true, introducedAt: true },
        orderBy: { order: "asc" },
      },
      prerequisites: {
        include: {
          prerequisite: {
            select: { slug: true, title: true, introducedAt: true },
          },
        },
      },
      outgoingRelations: {
        include: {
          target: { select: { slug: true, title: true } },
        },
        take: 6,
      },
      userProgress: {
        where: { userId: user.id },
        take: 1,
      },
      evidence: {
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      lessons: true,
    },
  });

  if (!concept) notFound();

  const vocabulary = await getVocabularyForGrammarConcept(
    user.id,
    concept.category,
    concept.id,
  );
  const progress = concept.userProgress[0] ?? null;
  const status = (progress?.status ?? "UNASSESSED") as GrammarStatusCode;
  const rules = stringArray(concept.rules);
  const examples = stringArray(concept.examples);
  const exceptions = stringArray(concept.exceptions);
  const lessonLanguage = user.preferredTranslation === "PERSIAN" ? "fa" : "en";
  const selectedLesson = concept.lessons.find((item) => item.language === lessonLanguage)
    ?? concept.lessons.find((item) => item.language === "en");
  const lesson = selectedLesson
    ? grammarLessonSchema.safeParse(selectedLesson)
    : null;
  const richLesson = lesson?.success ? lesson.data : null;

  return (
    <main className="page grammar-detail">
      <Link href="/grammar" className="back-link">
        <ArrowLeft size={16} />
        Grammar
      </Link>

      <section className="grammar-detail-hero">
        <div className="word-meta">
          <span className={"grammar-state grammar-state-" + status.toLowerCase()}>
            {grammarStatusLabel(status)}
          </span>
          <span className="badge">{concept.introducedAt}</span>
          {concept.expectedBy && concept.expectedBy !== concept.introducedAt ? (
            <span className="badge">expected by {concept.expectedBy}</span>
          ) : null}
        </div>
        <p className="eyebrow">{categoryLabel(concept.category)}</p>
        <h1>{concept.title}</h1>
        <p className="page-description">{concept.shortDescription}</p>

        <div className="grammar-detail-actions">
          <TeachGrammarSheet
            grammarConceptId={concept.id}
            label={concept.title}
            language={user.preferredTranslation === "PERSIAN" ? "fa" : "en"}
          />
          {status !== "STRONG" ? (
            <form action={startGrammarConceptAction}>
              <input type="hidden" name="grammarConceptId" value={concept.id} />
              <input type="hidden" name="slug" value={concept.slug} />
              <button className="button button-primary" type="submit">
                <BookOpenCheck size={17} />
                {status === "LEARNING" ? "Continue learning" : "Start learning"}
              </button>
            </form>
          ) : null}
          <Link href={"/practice?grammar=" + concept.slug} className="button button-secondary">
            <Brain size={17} />
            Open Practice
          </Link>
        </div>
      </section>

      {progress ? (
        <section className="panel grammar-profile-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR PROFILE</p>
              <h2>{progress.source === "DECLARED_LEVEL" ? "Assumed from your level" : "Based on learning evidence"}</h2>
            </div>
            <Sparkles size={19} />
          </div>
          {progress.evidenceCount > 0 ? (
            <div className="grammar-dimensions">
              <div>
                <span>Understanding</span>
                <strong>{dimensionLabel(progress.understanding)}</strong>
              </div>
              <div>
                <span>Controlled production</span>
                <strong>{dimensionLabel(progress.controlledProduction)}</strong>
              </div>
              <div>
                <span>Free production</span>
                <strong>{dimensionLabel(progress.freeProduction)}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">
              No behavioral evidence yet. U-Vocab will distinguish demonstrated
              knowledge from level-based assumptions as you practice and use German.
            </p>
          )}
        </section>
      ) : null}

      <section className="panel grammar-canonical-reference">
        <p className="eyebrow">CANONICAL REFERENCE</p>
        <h2>The curriculum definition</h2>
        <p>{concept.explanation || concept.shortDescription}</p>
        {rules.length ? (
          <details>
            <summary>Canonical rules</summary>
            <ol className="grammar-rule-list">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ol>
          </details>
        ) : null}
        {examples.length ? (
          <details>
            <summary>Canonical examples</summary>
            <div className="grammar-example-list">
              {examples.map((example) => (
                <div className="grammar-example" key={example}>{example}</div>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {richLesson ? (
        <GrammarLessonContent lesson={richLesson} language={selectedLesson?.language === "fa" ? "fa" : "en"} />
      ) : (
        <>
          <div className="grammar-detail-grid">
            <section className="panel grammar-teaching-card">
              <p className="eyebrow">WHY IT MATTERS</p>
              <h2>{concept.title}</h2>
              <p>{concept.explanation || concept.shortDescription}</p>
            </section>
            {rules.length ? (
              <section className="panel grammar-teaching-card">
                <p className="eyebrow">THE PATTERN</p>
                <h2>Rules</h2>
                <ol className="grammar-rule-list">
                  {rules.map((rule) => <li key={rule}>{rule}</li>)}
                </ol>
              </section>
            ) : null}
          </div>
          <section className="panel grammar-lesson-missing">
            <p className="eyebrow">FULL LESSON</p>
            <h2>Rich lesson data has not been generated yet</h2>
            <p className="muted">
              Run the grammar lesson backfill to populate the complete lesson for this concept.
              “Teach me more” is still available above for an on-demand explanation.
            </p>
          </section>
        </>
      )}

      <section className="panel grammar-watch-card">
        <CircleAlert size={20} />
        <div>
          <p className="eyebrow">QUICK WARNING</p>
          <h2>Common source of mistakes</h2>
          <p>{watchFor(concept.category)}</p>
          {!richLesson && exceptions.length ? (
            <ul>
              {exceptions.map((exception) => <li key={exception}>{exception}</li>)}
            </ul>
          ) : null}
        </div>
      </section>

      {concept.prerequisites.length || concept.parent || concept.children.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONNECTIONS</p>
              <h2>Where this fits</h2>
            </div>
            <Layers3 size={19} />
          </div>
          <div className="grammar-connection-list">
            {concept.parent ? (
              <Link href={"/grammar/" + concept.parent.slug}>
                <span>Parent concept</span>
                <strong>{concept.parent.title}</strong>
              </Link>
            ) : null}
            {concept.prerequisites.map(({ prerequisite }) => (
              <Link href={"/grammar/" + prerequisite.slug} key={prerequisite.slug}>
                <span>Prerequisite · {prerequisite.introducedAt}</span>
                <strong>{prerequisite.title}</strong>
              </Link>
            ))}
            {concept.children.map((child) => (
              <Link href={"/grammar/" + child.slug} key={child.slug}>
                <span>Builds into · {child.introducedAt}</span>
                <strong>{child.title}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {vocabulary.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR VOCABULARY</p>
              <h2>Reuse words you already have</h2>
            </div>
          </div>
          <p className="muted grammar-vocab-note">
            These are words from your own vocabulary that are explicitly linked to this grammar concept.
          </p>
          <div className="grammar-vocab-grid">
            {vocabulary.map((item) => (
              <Link href={"/vocabulary/" + item.lexeme.id} key={item.id}>
                <strong>
                  {item.lexeme.article ? item.lexeme.article + " " : ""}
                  {item.lexeme.lemma}
                </strong>
                {item.pattern ? (
                  <span>{item.pattern}</span>
                ) : item.lexeme.patterns[0] ? (
                  <span>{item.lexeme.patterns[0].pattern}</span>
                ) : (
                  <span>{item.relationType.replaceAll("_", " ").toLowerCase()}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {concept.evidence.length ? (
        <details className="grammar-evidence-disclosure">
          <summary>
            <span>
              <strong>Why U-Vocab thinks this</strong>
              <small>Recent evidence behind your grammar status</small>
            </span>
          </summary>
          <div className="grammar-evidence-list">
            {concept.evidence.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.outcome.replaceAll("_", " ").toLowerCase()}</strong>
                  <span>{item.source.replaceAll("_", " ").toLowerCase()}</span>
                </div>
                <small>
                  {item.accepted ? "counted toward your profile" : "stored, not counted"}
                  {item.excerpt ? " · " + item.excerpt : ""}
                </small>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {concept.outgoingRelations.length ? (
        <section className="grammar-related">
          <p className="eyebrow">RELATED</p>
          {concept.outgoingRelations.map((relation) => (
            <Link href={"/grammar/" + relation.target.slug} key={relation.id}>
              {relation.target.title}
              <ArrowRight size={15} />
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
