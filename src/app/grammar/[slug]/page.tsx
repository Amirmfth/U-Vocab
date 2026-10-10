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
import { recordProductEvent } from "@/lib/product-events";

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

  await recordProductEvent("grammar_lesson_opened", {
    grammarConceptId: concept.id,
    cefrLevel: concept.introducedAt,
  });

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
    <main className="page grammar-detail flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 gap-4.5">
      <Link href="/grammar" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
        <ArrowLeft className="rtl-mirror" size={16} />
        {t("grammar.detail.back")}
      </Link>

      <section className="grammar-detail-hero flex flex-col gap-3.5 padding-14px-0-2px in-h1:margin-3px-0-0 in-h1:max-w-uv-d1f4d3e141 in-h1:text-uv-fdd704d9153 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560">
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className={"grammar-state min-h-6.25 inline-flex items-center w-fit padding-0-8px border-1px-solid-border-2 rounded-uv-red9ab892c5 font-font-geist-mono-geist-mono-monospace text-uv-f174ef476a0 text-uv-text-soft bg-uv-surface-raised in-grammar-state-needs-attention:border-uv-c60009ca3c2 in-grammar-state-needs-attention:text-uv-c7d351e814d in-grammar-state-needs-attention:bg-uv-c8b3083dabe in-grammar-state-learning:border-uv-c85a9d06a78 in-grammar-state-learning:text-uv-c1d285c7551 in-grammar-state-learning:bg-uv-cbdfd7cd038 in-grammar-state-strong:border-uv-cad82869dd8 in-grammar-state-strong:text-uv-cf9ab83a8af in-grammar-state-strong:bg-uv-cafddaf6a65 in-grammar-state-assumed:border-uv-border in-grammar-state-assumed:text-uv-text-muted grammar-state-" + status.toLowerCase()}>
            {t(statusKeys[status])}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{concept.introducedAt}</span>
          {concept.expectedBy && concept.expectedBy !== concept.introducedAt ? (
            <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
              {t("grammar.detail.expectedBy", { level: concept.expectedBy })}
            </span>
          ) : null}
        </div>
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t(categoryKeys[concept.category])}</p>
        <h1 className="learning-content" lang="en" dir="ltr">
          {concept.title}
        </h1>
        <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65" lang="en" dir="ltr">
          {concept.shortDescription}
        </p>

        <div className="grammar-detail-actions flex flex-col gap-2 in-form:contents uv-min620:flex-row uv-min620:in-button-2:w-auto">
          <TeachGrammarSheet
            grammarConceptId={concept.id}
            label={concept.title}
            language={course.explanationLanguage === "PERSIAN" ? "fa" : "en"}
          />
          {status !== "STRONG" ? (
            <form action={startGrammarConceptAction}>
              <input type="hidden" name="grammarConceptId" value={concept.id} />
              <input type="hidden" name="slug" value={concept.slug} />
              <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit">
                <BookOpenCheck size={17} />
                {status === "LEARNING"
                  ? t("grammar.detail.continue")
                  : t("grammar.detail.start")}
              </button>
            </form>
          ) : null}
          <Link
            href={"/practice?grammar=" + concept.slug}
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
          >
            <Brain size={17} />
            {t("grammar.detail.openPractice")}
          </Link>
        </div>
      </section>

      {progress ? (
        <section className="panel grammar-profile-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 in-h2:margin-3px-0-0 in-h2:text-uv-fa9aa53fab2">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.profile")}</p>
              <h2>
                {progress.source === "DECLARED_LEVEL"
                  ? t("grammar.detail.assumedFromLevel")
                  : t("grammar.detail.basedOnEvidence")}
              </h2>
            </div>
            <Sparkles size={19} />
          </div>
          {progress.evidenceCount > 0 ? (
            <div className="grammar-dimensions grid grid-template-columns-1fr gap-1.75 in-div:min-h-13 in-div:flex in-div:items-center in-div:justify-between in-div:gap-3 in-div:padding-9px-11px in-div:border-1px-solid-border-2 in-div:rounded-uv-r0939007802 in-div:bg-uv-surface-raised in-span:text-uv-text-muted in-span:text-uv-ff1713651e0 in-strong-2:text-uv-text-soft in-strong-2:text-uv-ff1713651e0 uv-min620:grid-template-columns-repeat-3-minmax-0-1fr">
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
            <p className="muted text-uv-text-muted">{t("grammar.detail.noEvidence")}</p>
          )}
        </section>
      ) : null}

      <section className="panel grammar-canonical-reference border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p:m-0 in-p:text-uv-text-soft in-p:line-height-1p65 in-details:border-1px-solid-border-3 in-details:pt-2.5 in-summary:cursor-pointer in-summary:text-uv-text-soft in-summary:font-650 in-summary:text-uv-fe9d5fd6635 in-details-descendants-not-summary:mt-2.5">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.canonical")}</p>
        <h2>{t("grammar.detail.curriculumDefinition")}</h2>
        <p className="learning-content" lang="en" dir="ltr">
          {concept.explanation || concept.shortDescription}
        </p>
        {rules.length ? (
          <details>
            <summary>{t("grammar.detail.canonicalRules")}</summary>
            <ol className="grammar-rule-list m-0 text-uv-text-soft line-height-1p62 pl-5 in-li-li:mt-2">
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
            <div className="grammar-example-list grid grid-template-columns-1fr gap-2 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
              {examples.map((example) => (
                <div className="grammar-example learning-content padding-14px-15px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface text-uv-fbe55c92df5 line-height-1p55" dir="auto" key={example}>
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
          targetLanguageCode={language.code}
        />
      ) : (
        <>
          <div className="grammar-detail-grid grid grid-template-columns-1fr gap-2.5 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
            <section className="panel grammar-teaching-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 in-h2:margin-3px-0-0 in-h2:text-uv-fa9aa53fab2 in-p-last-child:m-0 in-p-last-child:text-uv-text-soft in-p-last-child:line-height-1p62">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.whyMatters")}</p>
              <h2 className="learning-content" lang="en" dir="ltr">
                {concept.title}
              </h2>
              <p className="learning-content" lang="en" dir="ltr">
                {concept.explanation || concept.shortDescription}
              </p>
            </section>
            {rules.length ? (
              <section className="panel grammar-teaching-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 in-h2:margin-3px-0-0 in-h2:text-uv-fa9aa53fab2 in-p-last-child:m-0 in-p-last-child:text-uv-text-soft in-p-last-child:line-height-1p62">
                <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.pattern")}</p>
                <h2>{t("grammar.detail.rules")}</h2>
                <ol className="grammar-rule-list m-0 text-uv-text-soft line-height-1p62 pl-5 in-li-li:mt-2">
                  {rules.map((rule) => (
                    <li key={rule} className="learning-content" dir="auto">
                      {rule}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <section className="panel grammar-lesson-missing border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.fullLesson")}</p>
            <h2>{t("grammar.detail.lessonMissing")}</h2>
            <p className="muted text-uv-text-muted">{t("grammar.detail.lessonMissingHelp")}</p>
          </section>
        </>
      )}

      <section className="panel grammar-watch-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c flex-col gap-3 in-h2:margin-3px-0-0 in-h2:text-uv-fa9aa53fab2 in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p62 grid grid-template-columns-24px-minmax-0-1fr items-start in-svg:text-uv-danger in-ul:margin-10px-0-0 in-ul:pl-4.5 in-ul:text-uv-text-muted">
        <CircleAlert size={20} />
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.quickWarning")}</p>
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
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.connections")}</p>
              <h2>{t("grammar.detail.whereFits")}</h2>
            </div>
            <Layers3 size={19} />
          </div>
          <div className="grammar-connection-list grid grid-template-columns-1fr gap-2 in-a:min-h-14.5 in-a:flex in-a:flex-col in-a:justify-center in-a:gap-0.75 in-a:padding-10px-12px in-a:border-1px-solid-border-2 in-a:rounded-uv-r233710a71e in-a:bg-uv-surface in-span:text-uv-text-muted in-span:text-uv-f2311a7d95c in-strong-2:text-uv-f6c2d68ddb8 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:grid-template-columns-repeat-3-minmax-0-1fr">
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
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.yourVocabulary")}</p>
              <h2>{t("grammar.detail.reuseWords")}</h2>
            </div>
          </div>
          <p className="muted grammar-vocab-note text-uv-text-muted margin-4px-0-0-2 max-w-uv-8b89fb679d text-uv-ff1713651e0 line-height-1p5">
            {t("grammar.detail.vocabHelp")}
          </p>
          <div className="grammar-vocab-grid grid grid-template-columns-1fr gap-2 in-a:min-h-14.5 in-a:flex in-a:flex-col in-a:justify-center in-a:gap-0.75 in-a:padding-10px-12px in-a:border-1px-solid-border-2 in-a:rounded-uv-r233710a71e in-a:bg-uv-surface in-span:text-uv-text-muted in-span:text-uv-f2311a7d95c in-strong-2:text-uv-f6c2d68ddb8 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:grid-template-columns-repeat-3-minmax-0-1fr">
            {vocabulary.map((item) => (
              <Link href={"/vocabulary/" + item.lexeme.id} key={item.id}>
                <strong className="learning-content" lang={language.code} dir="ltr">
                  {item.lexeme.article ? item.lexeme.article + " " : ""}
                  {item.lexeme.lemma}
                </strong>
                {item.pattern ? (
                  <span className="learning-content" lang={language.code} dir="ltr">
                    {item.pattern}
                  </span>
                ) : item.lexeme.patterns[0] ? (
                  <span className="learning-content" lang={language.code} dir="ltr">
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
        <details className="grammar-evidence-disclosure p-0 overflow-hidden in-summary-2:min-h-15.5 in-summary-2:flex in-summary-2:items-center in-summary-2:padding-12px-14px in-summary-2:list-none in-summary-webkit-details-marker:hidden in-summary-span:flex in-summary-span:flex-col in-summary-span:gap-0.75 in-summary-strong:text-uv-text in-summary-strong:text-uv-fcc370f51d4 in-summary-small:text-uv-text-muted in-summary-small:text-uv-f2311a7d95c">
          <summary>
            <span>
              <strong>{t("grammar.detail.evidenceWhy")}</strong>
              <small>{t("grammar.detail.evidenceHelp")}</small>
            </span>
          </summary>
          <div className="grammar-evidence-list padding-0-14px-14px in-div:padding-10px-0 in-div:border-1px-solid-border-3 in-div-div-2:flex in-div-div-2:justify-between in-div-div-2:gap-3 in-strong-2:text-uv-f78eb7000a9 in-span:text-uv-f78eb7000a9 in-small:text-uv-f78eb7000a9 in-span:text-uv-text-muted in-small:text-uv-text-muted">
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
        <section className="grammar-related flex flex-wrap items-center gap-2 in-p:w-full in-a:min-h-9.5 in-a:inline-flex in-a:items-center in-a:gap-1.5 in-a:padding-0-10px in-a:border-1px-solid-border-2 in-a:rounded-uv-red9ab892c5 in-a:text-uv-text-soft in-a:text-uv-f58b84cc6f5">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.detail.related")}</p>
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
