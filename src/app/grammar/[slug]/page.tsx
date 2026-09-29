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
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { db } from "@/lib/db";
import type { GrammarStatusCode } from "@/lib/grammar/learner-policy";
import { getVocabularyForGrammarConcept } from "@/lib/grammar/related-vocabulary";
import { startGrammarConceptAction } from "../actions";
import { grammarLessonSchema } from "@/lib/ai/grammar-lesson";
import { getServerTranslator } from "@/i18n/server";
import type { MessageKey, Translator } from "@/i18n/core";
import { GrammarLessonContent } from "./GrammarLessonContent";
import { TeachGrammarSheet } from "./TeachGrammarSheet";

const categoryKeys: Record<GrammarCategory, MessageKey> = {
  SENTENCE_STRUCTURE: "grammar.category.sentence_structure",
  CASES: "grammar.category.cases",
  VERBS: "grammar.category.verbs",
  TENSES: "grammar.category.tenses",
  ARTICLES: "grammar.category.articles",
  ADJECTIVES: "grammar.category.adjectives",
  PREPOSITIONS: "grammar.category.prepositions",
  PRONOUNS: "grammar.category.pronouns",
  CONJUNCTIONS: "grammar.category.conjunctions",
  RELATIVE_CLAUSES: "grammar.category.relative_clauses",
  NEGATION: "grammar.category.negation",
  COMPARISON: "grammar.category.comparison",
  PASSIVE: "grammar.category.passive",
  SUBJUNCTIVE: "grammar.category.subjunctive",
  INFINITIVE_CONSTRUCTIONS: "grammar.category.infinitive_constructions",
  NOUNS: "grammar.category.nouns",
  ADVERBS_PARTICLES: "grammar.category.adverbs_particles",
  WORD_FORMATION: "grammar.category.word_formation",
};

const statusKeys: Record<GrammarStatusCode, MessageKey> = {
  UNASSESSED: "grammar.status.unassessed",
  ASSUMED: "grammar.status.assumed",
  LEARNING: "grammar.status.learning",
  STRONG: "grammar.status.strong",
  NEEDS_ATTENTION: "grammar.status.needs_attention",
};

const grammarRelationKeys: Record<string, MessageKey> = {
  EXEMPLIFIES: "word.grammarRelation.exemplifies",
  GOVERNS: "word.grammarRelation.governs",
  TRIGGERS: "word.grammarRelation.triggers",
  COMMON_WITH: "word.grammarRelation.common_with",
};

const outcomeKeys: Record<string, MessageKey> = {
  SUCCESS: "grammar.detail.outcome.success",
  ERROR: "grammar.detail.outcome.error",
  OPPORTUNITY: "grammar.detail.outcome.opportunity",
  ENCOUNTER: "grammar.detail.outcome.encounter",
};

const evidenceSourceKeys: Record<string, MessageKey> = {
  PRACTICE: "grammar.detail.source.practice",
  WRITING: "grammar.detail.source.writing",
  READING_COMPREHENSION: "grammar.detail.source.reading_comprehension",
  CONVERSATION: "grammar.detail.source.conversation",
  MANUAL: "grammar.detail.source.manual",
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function watchForKey(category: GrammarCategory): MessageKey {
  switch (category) {
    case "CASES":
      return "grammar.detail.watch.cases";
    case "PREPOSITIONS":
      return "grammar.detail.watch.prepositions";
    case "SENTENCE_STRUCTURE":
    case "CONJUNCTIONS":
    case "RELATIVE_CLAUSES":
      return "grammar.detail.watch.wordOrder";
    case "ADJECTIVES":
      return "grammar.detail.watch.adjectives";
    case "TENSES":
    case "VERBS":
      return "grammar.detail.watch.verbs";
    default:
      return "grammar.detail.watch.default";
  }
}

function dimensionLabel(t: Translator, score: number) {
  if (score >= 0.8) return t("grammar.detail.evidenceStrong");
  if (score >= 0.55) return t("grammar.detail.evidenceDeveloping");
  if (score > 0) return t("grammar.detail.evidenceNeedsWork");
  return t("grammar.detail.evidenceNone");
}

export default async function GrammarConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { locale, t } = await getServerTranslator(user);
  const language = targetLanguageConfig(course.targetLanguage);

  const concept = await db.grammarConcept.findFirst({
    where: { slug, language: language.code, active: true },
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
        where: { userCourseId: course.id },
        take: 1,
      },
      evidence: {
        where: { userCourseId: course.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      lessons: true,
    },
  });

  if (!concept) notFound();

  const vocabulary = await getVocabularyForGrammarConcept(
    user.id,
    course.id,
    concept.category,
    concept.id,
  );
  const progress = concept.userProgress[0] ?? null;
  const status = (progress?.status ?? "UNASSESSED") as GrammarStatusCode;
  const rules = stringArray(concept.rules);
  const examples = stringArray(concept.examples);
  const exceptions = stringArray(concept.exceptions);
  const lessonLanguage =
    course.explanationLanguage === "PERSIAN" ? "fa" : "en";
  const selectedLesson =
    concept.lessons.find((item) => item.language === lessonLanguage) ??
    concept.lessons.find((item) => item.language === "en");
  const lesson = selectedLesson
    ? grammarLessonSchema.safeParse(selectedLesson)
    : null;
  const richLesson = lesson?.success ? lesson.data : null;

  return (
    <main className="page grammar-detail">
      <Link href="/grammar" className="back-link">
        <ArrowLeft className="rtl-mirror" size={16} />
        {t("grammar.detail.back")}
      </Link>

      <section className="grammar-detail-hero">
        <div className="word-meta">
          <span className={"grammar-state grammar-state-" + status.toLowerCase()}>
            {t(statusKeys[status])}
          </span>
          <span className="badge">{concept.introducedAt}</span>
          {concept.expectedBy && concept.expectedBy !== concept.introducedAt ? (
            <span className="badge">
              {t("grammar.detail.expectedBy", { level: concept.expectedBy })}
            </span>
          ) : null}
        </div>
        <p className="eyebrow">{t(categoryKeys[concept.category])}</p>
        <h1 className="learning-content" lang="en" dir="ltr">
          {concept.title}
        </h1>
        <p className="page-description learning-content" lang="en" dir="ltr">
          {concept.shortDescription}
        </p>

        <div className="grammar-detail-actions">
          <TeachGrammarSheet
            grammarConceptId={concept.id}
            label={concept.title}
            language={course.explanationLanguage === "PERSIAN" ? "fa" : "en"}
          />
          {status !== "STRONG" ? (
            <form action={startGrammarConceptAction}>
              <input type="hidden" name="grammarConceptId" value={concept.id} />
              <input type="hidden" name="slug" value={concept.slug} />
              <button className="button button-primary" type="submit">
                <BookOpenCheck size={17} />
                {status === "LEARNING"
                  ? t("grammar.detail.continue")
                  : t("grammar.detail.start")}
              </button>
            </form>
          ) : null}
          <Link
            href={"/practice?grammar=" + concept.slug}
            className="button button-secondary"
          >
            <Brain size={17} />
            {t("grammar.detail.openPractice")}
          </Link>
        </div>
      </section>

      {progress ? (
        <section className="panel grammar-profile-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.detail.profile")}</p>
              <h2>
                {progress.source === "DECLARED_LEVEL"
                  ? t("grammar.detail.assumedFromLevel")
                  : t("grammar.detail.basedOnEvidence")}
              </h2>
            </div>
            <Sparkles size={19} />
          </div>
          {progress.evidenceCount > 0 ? (
            <div className="grammar-dimensions">
              <div>
                <span>{t("grammar.detail.understanding")}</span>
                <strong>{dimensionLabel(t, progress.understanding)}</strong>
              </div>
              <div>
                <span>{t("grammar.detail.controlledProduction")}</span>
                <strong>
                  {dimensionLabel(t, progress.controlledProduction)}
                </strong>
              </div>
              <div>
                <span>{t("grammar.detail.freeProduction")}</span>
                <strong>{dimensionLabel(t, progress.freeProduction)}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">{t("grammar.detail.noEvidence")}</p>
          )}
        </section>
      ) : null}

      <section className="panel grammar-canonical-reference">
        <p className="eyebrow">{t("grammar.detail.canonical")}</p>
        <h2>{t("grammar.detail.curriculumDefinition")}</h2>
        <p className="learning-content" lang="en" dir="ltr">
          {concept.explanation || concept.shortDescription}
        </p>
        {rules.length ? (
          <details>
            <summary>{t("grammar.detail.canonicalRules")}</summary>
            <ol className="grammar-rule-list">
              {rules.map((rule) => (
                <li key={rule} className="learning-content" dir="auto">
                  {rule}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        {examples.length ? (
          <details>
            <summary>{t("grammar.detail.canonicalExamples")}</summary>
            <div className="grammar-example-list">
              {examples.map((example) => (
                <div className="grammar-example learning-content" dir="auto" key={example}>
                  {example}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {richLesson ? (
        <GrammarLessonContent
          lesson={richLesson}
          language={selectedLesson?.language === "fa" ? "fa" : "en"}
          uiLocale={locale}
        />
      ) : (
        <>
          <div className="grammar-detail-grid">
            <section className="panel grammar-teaching-card">
              <p className="eyebrow">{t("grammar.detail.whyMatters")}</p>
              <h2 className="learning-content" lang="en" dir="ltr">
                {concept.title}
              </h2>
              <p className="learning-content" lang="en" dir="ltr">
                {concept.explanation || concept.shortDescription}
              </p>
            </section>
            {rules.length ? (
              <section className="panel grammar-teaching-card">
                <p className="eyebrow">{t("grammar.detail.pattern")}</p>
                <h2>{t("grammar.detail.rules")}</h2>
                <ol className="grammar-rule-list">
                  {rules.map((rule) => (
                    <li key={rule} className="learning-content" dir="auto">
                      {rule}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <section className="panel grammar-lesson-missing">
            <p className="eyebrow">{t("grammar.detail.fullLesson")}</p>
            <h2>{t("grammar.detail.lessonMissing")}</h2>
            <p className="muted">{t("grammar.detail.lessonMissingHelp")}</p>
          </section>
        </>
      )}

      <section className="panel grammar-watch-card">
        <CircleAlert size={20} />
        <div>
          <p className="eyebrow">{t("grammar.detail.quickWarning")}</p>
          <h2>{t("grammar.detail.commonMistakes")}</h2>
          <p>{t(watchForKey(concept.category))}</p>
          {!richLesson && exceptions.length ? (
            <ul>
              {exceptions.map((exception) => (
                <li key={exception} className="learning-content" dir="auto">
                  {exception}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {concept.prerequisites.length || concept.parent || concept.children.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.detail.connections")}</p>
              <h2>{t("grammar.detail.whereFits")}</h2>
            </div>
            <Layers3 size={19} />
          </div>
          <div className="grammar-connection-list">
            {concept.parent ? (
              <Link href={"/grammar/" + concept.parent.slug}>
                <span>{t("grammar.detail.parent")}</span>
                <strong className="learning-content" lang="en" dir="ltr">
                  {concept.parent.title}
                </strong>
              </Link>
            ) : null}
            {concept.prerequisites.map(({ prerequisite }) => (
              <Link
                href={"/grammar/" + prerequisite.slug}
                key={prerequisite.slug}
              >
                <span>
                  {t("grammar.detail.prerequisite", {
                    level: prerequisite.introducedAt,
                  })}
                </span>
                <strong className="learning-content" lang="en" dir="ltr">
                  {prerequisite.title}
                </strong>
              </Link>
            ))}
            {concept.children.map((child) => (
              <Link href={"/grammar/" + child.slug} key={child.slug}>
                <span>
                  {t("grammar.detail.buildsInto", {
                    level: child.introducedAt,
                  })}
                </span>
                <strong className="learning-content" lang="en" dir="ltr">
                  {child.title}
                </strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {vocabulary.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.detail.yourVocabulary")}</p>
              <h2>{t("grammar.detail.reuseWords")}</h2>
            </div>
          </div>
          <p className="muted grammar-vocab-note">
            {t("grammar.detail.vocabHelp")}
          </p>
          <div className="grammar-vocab-grid">
            {vocabulary.map((item) => (
              <Link href={"/vocabulary/" + item.lexeme.id} key={item.id}>
                <strong className="learning-content" lang="de" dir="ltr">
                  {item.lexeme.article ? item.lexeme.article + " " : ""}
                  {item.lexeme.lemma}
                </strong>
                {item.pattern ? (
                  <span className="learning-content" lang="de" dir="ltr">
                    {item.pattern}
                  </span>
                ) : item.lexeme.patterns[0] ? (
                  <span className="learning-content" lang="de" dir="ltr">
                    {item.lexeme.patterns[0].pattern}
                  </span>
                ) : (
                  <span>
                    {grammarRelationKeys[item.relationType]
                      ? t(grammarRelationKeys[item.relationType])
                      : item.relationType.replaceAll("_", " ").toLowerCase()}
                  </span>
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
              <strong>{t("grammar.detail.evidenceWhy")}</strong>
              <small>{t("grammar.detail.evidenceHelp")}</small>
            </span>
          </summary>
          <div className="grammar-evidence-list">
            {concept.evidence.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>
                    {outcomeKeys[item.outcome]
                      ? t(outcomeKeys[item.outcome])
                      : item.outcome.toLowerCase()}
                  </strong>
                  <span>
                    {evidenceSourceKeys[item.source]
                      ? t(evidenceSourceKeys[item.source])
                      : item.source.toLowerCase()}
                  </span>
                </div>
                <small>
                  {item.accepted
                    ? t("grammar.detail.counted")
                    : t("grammar.detail.notCounted")}
                  {item.excerpt ? (
                    <>
                      {" · "}
                      <span className="learning-content" dir="auto">
                        {item.excerpt}
                      </span>
                    </>
                  ) : null}
                </small>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {concept.outgoingRelations.length ? (
        <section className="grammar-related">
          <p className="eyebrow">{t("grammar.detail.related")}</p>
          {concept.outgoingRelations.map((relation) => (
            <Link href={"/grammar/" + relation.target.slug} key={relation.id}>
              <span className="learning-content" lang="en" dir="ltr">
                {relation.target.title}
              </span>
              <ArrowRight className="rtl-mirror" size={15} />
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
