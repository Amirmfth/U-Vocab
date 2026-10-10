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

      <section className="grammar-detail-hero flex flex-col gap-3.5 uv-padding-2753259b77 uv-v3bccf64584:uv-margin-4dbe78398d uv-v3bccf64584:max-w-uv-d1f4d3e141 uv-v3bccf64584:text-uv-fdd704d9153 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560">
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          <span className={"grammar-state min-h-6.25 inline-flex items-center w-fit uv-padding-4f85d0e84d uv-border-8d7f82f403 rounded-uv-red9ab892c5 uv-font-family-320794573f text-uv-f174ef476a0 text-uv-text-soft bg-uv-surface-raised uv-v828a2a58d3:border-uv-c60009ca3c2 uv-v828a2a58d3:text-uv-c7d351e814d uv-v828a2a58d3:bg-uv-c8b3083dabe uv-vfcdc2edabe:border-uv-c85a9d06a78 uv-vfcdc2edabe:text-uv-c1d285c7551 uv-vfcdc2edabe:bg-uv-cbdfd7cd038 uv-v516803f730:border-uv-cad82869dd8 uv-v516803f730:text-uv-cf9ab83a8af uv-v516803f730:bg-uv-cafddaf6a65 uv-v9a6fa25db7:border-uv-border uv-v9a6fa25db7:text-uv-text-muted grammar-state-" + status.toLowerCase()}>
            {t(statusKeys[status])}
          </span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{concept.introducedAt}</span>
          {concept.expectedBy && concept.expectedBy !== concept.introducedAt ? (
            <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
              {t("grammar.detail.expectedBy", { level: concept.expectedBy })}
            </span>
          ) : null}
        </div>
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t(categoryKeys[concept.category])}</p>
        <h1 className="learning-content" lang="en" dir="ltr">
          {concept.title}
        </h1>
        <p className="page-description learning-content m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a" lang="en" dir="ltr">
          {concept.shortDescription}
        </p>

        <div className="grammar-detail-actions flex flex-col gap-2 uv-v8cd0743a41:contents uv-min620:flex-row uv-min620:uv-vcded88c612:w-auto">
          <TeachGrammarSheet
            grammarConceptId={concept.id}
            label={concept.title}
            language={course.explanationLanguage === "PERSIAN" ? "fa" : "en"}
          />
          {status !== "STRONG" ? (
            <form action={startGrammarConceptAction}>
              <input type="hidden" name="grammarConceptId" value={concept.id} />
              <input type="hidden" name="slug" value={concept.slug} />
              <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit">
                <BookOpenCheck size={17} />
                {status === "LEARNING"
                  ? t("grammar.detail.continue")
                  : t("grammar.detail.start")}
              </button>
            </form>
          ) : null}
          <Link
            href={"/practice?grammar=" + concept.slug}
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
          >
            <Brain size={17} />
            {t("grammar.detail.openPractice")}
          </Link>
        </div>
      </section>

      {progress ? (
        <section className="panel grammar-profile-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 uv-vd552c26874:uv-margin-4dbe78398d uv-vd552c26874:text-uv-fa9aa53fab2">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.profile")}</p>
              <h2>
                {progress.source === "DECLARED_LEVEL"
                  ? t("grammar.detail.assumedFromLevel")
                  : t("grammar.detail.basedOnEvidence")}
              </h2>
            </div>
            <Sparkles size={19} />
          </div>
          {progress.evidenceCount > 0 ? (
            <div className="grammar-dimensions grid uv-grid-template-columns-6a5c4d4d49 gap-1.75 uv-vcbb57f4d35:min-h-13 uv-vcbb57f4d35:flex uv-vcbb57f4d35:items-center uv-vcbb57f4d35:justify-between uv-vcbb57f4d35:gap-3 uv-vcbb57f4d35:uv-padding-1f71e5d904 uv-vcbb57f4d35:uv-border-8d7f82f403 uv-vcbb57f4d35:rounded-uv-r0939007802 uv-vcbb57f4d35:bg-uv-surface-raised uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff1713651e0 uv-veda02a0adb:text-uv-text-soft uv-veda02a0adb:text-uv-ff1713651e0 uv-min620:uv-grid-template-columns-563355decf">
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

      <section className="panel grammar-canonical-reference uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-v026f084606:m-0 uv-v026f084606:text-uv-text-soft uv-v026f084606:uv-line-height-cf9a155f4a uv-v91ffd8b624:uv-border-top-8d7f82f403 uv-v91ffd8b624:pt-2.5 uv-vaa46806d56:cursor-pointer uv-vaa46806d56:text-uv-text-soft uv-vaa46806d56:uv-weight-650 uv-vaa46806d56:text-uv-fe9d5fd6635 uv-v9d25868181:mt-2.5">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.canonical")}</p>
        <h2>{t("grammar.detail.curriculumDefinition")}</h2>
        <p className="learning-content" lang="en" dir="ltr">
          {concept.explanation || concept.shortDescription}
        </p>
        {rules.length ? (
          <details>
            <summary>{t("grammar.detail.canonicalRules")}</summary>
            <ol className="grammar-rule-list m-0 text-uv-text-soft uv-line-height-daa388cc8c pl-5 uv-vfe836888b7:mt-2">
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
            <div className="grammar-example-list grid uv-grid-template-columns-6a5c4d4d49 gap-2 uv-min620:uv-grid-template-columns-dd0b1a1848">
              {examples.map((example) => (
                <div className="grammar-example learning-content uv-padding-815f98af78 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-uv-fbe55c92df5 uv-line-height-05c248da4c" dir="auto" key={example}>
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
          <div className="grammar-detail-grid grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min620:uv-grid-template-columns-dd0b1a1848">
            <section className="panel grammar-teaching-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 uv-vd552c26874:uv-margin-4dbe78398d uv-vd552c26874:text-uv-fa9aa53fab2 uv-vd9a40650be:m-0 uv-vd9a40650be:text-uv-text-soft uv-vd9a40650be:uv-line-height-daa388cc8c">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.whyMatters")}</p>
              <h2 className="learning-content" lang="en" dir="ltr">
                {concept.title}
              </h2>
              <p className="learning-content" lang="en" dir="ltr">
                {concept.explanation || concept.shortDescription}
              </p>
            </section>
            {rules.length ? (
              <section className="panel grammar-teaching-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c flex flex-col gap-3 uv-vd552c26874:uv-margin-4dbe78398d uv-vd552c26874:text-uv-fa9aa53fab2 uv-vd9a40650be:m-0 uv-vd9a40650be:text-uv-text-soft uv-vd9a40650be:uv-line-height-daa388cc8c">
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.pattern")}</p>
                <h2>{t("grammar.detail.rules")}</h2>
                <ol className="grammar-rule-list m-0 text-uv-text-soft uv-line-height-daa388cc8c pl-5 uv-vfe836888b7:mt-2">
                  {rules.map((rule) => (
                    <li key={rule} className="learning-content" dir="auto">
                      {rule}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <section className="panel grammar-lesson-missing uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.fullLesson")}</p>
            <h2>{t("grammar.detail.lessonMissing")}</h2>
            <p className="muted text-uv-text-muted">{t("grammar.detail.lessonMissingHelp")}</p>
          </section>
        </>
      )}

      <section className="panel grammar-watch-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c flex-col gap-3 uv-vd552c26874:uv-margin-4dbe78398d uv-vd552c26874:text-uv-fa9aa53fab2 uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-daa388cc8c grid uv-grid-template-columns-5416fe9056 items-start uv-v872d6ea02a:text-uv-danger uv-v10010674ad:uv-margin-456435724d uv-v10010674ad:pl-4.5 uv-v10010674ad:text-uv-text-muted">
        <CircleAlert size={20} />
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.quickWarning")}</p>
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
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.connections")}</p>
              <h2>{t("grammar.detail.whereFits")}</h2>
            </div>
            <Layers3 size={19} />
          </div>
          <div className="grammar-connection-list grid uv-grid-template-columns-6a5c4d4d49 gap-2 uv-v99777dc5b4:min-h-14.5 uv-v99777dc5b4:flex uv-v99777dc5b4:flex-col uv-v99777dc5b4:justify-center uv-v99777dc5b4:gap-0.75 uv-v99777dc5b4:uv-padding-df857c6c31 uv-v99777dc5b4:uv-border-8d7f82f403 uv-v99777dc5b4:rounded-uv-r233710a71e uv-v99777dc5b4:bg-uv-surface uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f2311a7d95c uv-veda02a0adb:text-uv-f6c2d68ddb8 uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-grid-template-columns-563355decf">
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
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.yourVocabulary")}</p>
              <h2>{t("grammar.detail.reuseWords")}</h2>
            </div>
          </div>
          <p className="muted grammar-vocab-note text-uv-text-muted uv-margin-115dc61086 max-w-uv-8b89fb679d text-uv-ff1713651e0 uv-line-height-aa8f289ebe">
            {t("grammar.detail.vocabHelp")}
          </p>
          <div className="grammar-vocab-grid grid uv-grid-template-columns-6a5c4d4d49 gap-2 uv-v99777dc5b4:min-h-14.5 uv-v99777dc5b4:flex uv-v99777dc5b4:flex-col uv-v99777dc5b4:justify-center uv-v99777dc5b4:gap-0.75 uv-v99777dc5b4:uv-padding-df857c6c31 uv-v99777dc5b4:uv-border-8d7f82f403 uv-v99777dc5b4:rounded-uv-r233710a71e uv-v99777dc5b4:bg-uv-surface uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f2311a7d95c uv-veda02a0adb:text-uv-f6c2d68ddb8 uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-grid-template-columns-563355decf">
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
        <details className="grammar-evidence-disclosure p-0 overflow-hidden uv-v1888c0d32c:min-h-15.5 uv-v1888c0d32c:flex uv-v1888c0d32c:items-center uv-v1888c0d32c:uv-padding-277e98e510 uv-v1888c0d32c:list-none uv-v0f504617cb:hidden uv-v54584f9d98:flex uv-v54584f9d98:flex-col uv-v54584f9d98:gap-0.75 uv-v0c36329b9e:text-uv-text uv-v0c36329b9e:text-uv-fcc370f51d4 uv-vb8cdaac41c:text-uv-text-muted uv-vb8cdaac41c:text-uv-f2311a7d95c">
          <summary>
            <span>
              <strong>{t("grammar.detail.evidenceWhy")}</strong>
              <small>{t("grammar.detail.evidenceHelp")}</small>
            </span>
          </summary>
          <div className="grammar-evidence-list uv-padding-455d6903c4 uv-vcbb57f4d35:uv-padding-10ff753f5f uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-vc5efaac82a:flex uv-vc5efaac82a:justify-between uv-vc5efaac82a:gap-3 uv-veda02a0adb:text-uv-f78eb7000a9 uv-v36c0309a03:text-uv-f78eb7000a9 uv-v982220ddd5:text-uv-f78eb7000a9 uv-v36c0309a03:text-uv-text-muted uv-v982220ddd5:text-uv-text-muted">
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
        <section className="grammar-related flex flex-wrap items-center gap-2 uv-v026f084606:w-full uv-v99777dc5b4:min-h-9.5 uv-v99777dc5b4:inline-flex uv-v99777dc5b4:items-center uv-v99777dc5b4:gap-1.5 uv-v99777dc5b4:uv-padding-4d5c65a39c uv-v99777dc5b4:uv-border-8d7f82f403 uv-v99777dc5b4:rounded-uv-red9ab892c5 uv-v99777dc5b4:text-uv-text-soft uv-v99777dc5b4:text-uv-f58b84cc6f5">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.detail.related")}</p>
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
