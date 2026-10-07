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
    <main className="page grammar-detail [display:flex] [flex-direction:column] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [gap:18px]">
      <Link href="/grammar" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
        <ArrowLeft className="rtl-mirror" size={16} />
        {t("grammar.detail.back")}
      </Link>

      <section className="grammar-detail-hero [display:flex] [flex-direction:column] [gap:14px] [padding:14px_0_2px] [&_h1]:[margin:3px_0_0] [&_h1]:[max-width:820px] [&_h1]:[font-size:clamp(2.25rem,_11vw,_4.8rem)] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560]">
        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          <span className={"grammar-state [min-height:25px] [display:inline-flex] [align-items:center] [width:fit-content] [padding:0_8px] [border:1px_solid_var(--border)] [border-radius:999px] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.62rem] [color:var(--text-soft)] [background:var(--surface-raised)] [&.grammar-state-needs_attention]:[border-color:rgba(255,_107,_122,_0.28)] [&.grammar-state-needs_attention]:[color:#ffc2c9] [&.grammar-state-needs_attention]:[background:var(--danger-soft)] [&.grammar-state-learning]:[border-color:rgba(139,_124,_255,_0.28)] [&.grammar-state-learning]:[color:#d7d2ff] [&.grammar-state-learning]:[background:var(--primary-soft)] [&.grammar-state-strong]:[border-color:rgba(73,_201,_139,_0.25)] [&.grammar-state-strong]:[color:#b8f2d4] [&.grammar-state-strong]:[background:var(--success-soft)] [&.grammar-state-assumed]:[border-color:var(--border)] [&.grammar-state-assumed]:[color:var(--text-muted)] grammar-state-" + status.toLowerCase()}>
            {t(statusKeys[status])}
          </span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{concept.introducedAt}</span>
          {concept.expectedBy && concept.expectedBy !== concept.introducedAt ? (
            <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
              {t("grammar.detail.expectedBy", { level: concept.expectedBy })}
            </span>
          ) : null}
        </div>
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t(categoryKeys[concept.category])}</p>
        <h1 className="learning-content" lang="en" dir="ltr">
          {concept.title}
        </h1>
        <p className="page-description learning-content [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]" lang="en" dir="ltr">
          {concept.shortDescription}
        </p>

        <div className="grammar-detail-actions [display:flex] [flex-direction:column] [gap:8px] [&_form]:[display:contents] min-[620px]:[flex-direction:row] min-[620px]:[&_.button]:[width:auto]">
          <TeachGrammarSheet
            grammarConceptId={concept.id}
            label={concept.title}
            language={course.explanationLanguage === "PERSIAN" ? "fa" : "en"}
          />
          {status !== "STRONG" ? (
            <form action={startGrammarConceptAction}>
              <input type="hidden" name="grammarConceptId" value={concept.id} />
              <input type="hidden" name="slug" value={concept.slug} />
              <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit">
                <BookOpenCheck size={17} />
                {status === "LEARNING"
                  ? t("grammar.detail.continue")
                  : t("grammar.detail.start")}
              </button>
            </form>
          ) : null}
          <Link
            href={"/practice?grammar=" + concept.slug}
            className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
          >
            <Brain size={17} />
            {t("grammar.detail.openPractice")}
          </Link>
        </div>
      </section>

      {progress ? (
        <section className="panel grammar-profile-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:3px_0_0] [&_h2]:[font-size:1.05rem]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.profile")}</p>
              <h2>
                {progress.source === "DECLARED_LEVEL"
                  ? t("grammar.detail.assumedFromLevel")
                  : t("grammar.detail.basedOnEvidence")}
              </h2>
            </div>
            <Sparkles size={19} />
          </div>
          {progress.evidenceCount > 0 ? (
            <div className="grammar-dimensions [display:grid] [grid-template-columns:1fr] [gap:7px] [&_>_div]:[min-height:52px] [&_>_div]:[display:flex] [&_>_div]:[align-items:center] [&_>_div]:[justify-content:space-between] [&_>_div]:[gap:12px] [&_>_div]:[padding:9px_11px] [&_>_div]:[border:1px_solid_var(--border)] [&_>_div]:[border-radius:12px] [&_>_div]:[background:var(--surface-raised)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.72rem] [&_strong]:[color:var(--text-soft)] [&_strong]:[font-size:0.72rem] min-[620px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]">
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
            <p className="muted [color:var(--text-muted)]">{t("grammar.detail.noEvidence")}</p>
          )}
        </section>
      ) : null}

      <section className="panel grammar-canonical-reference [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_>_p]:[margin:0] [&_>_p]:[color:var(--text-soft)] [&_>_p]:[line-height:1.65] [&_details]:[border-top:1px_solid_var(--border)] [&_details]:[padding-top:10px] [&_summary]:[cursor:pointer] [&_summary]:[color:var(--text-soft)] [&_summary]:[font-weight:650] [&_summary]:[font-size:0.78rem] [&_details_>_*:not(summary)]:[margin-top:10px]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.canonical")}</p>
        <h2>{t("grammar.detail.curriculumDefinition")}</h2>
        <p className="learning-content" lang="en" dir="ltr">
          {concept.explanation || concept.shortDescription}
        </p>
        {rules.length ? (
          <details>
            <summary>{t("grammar.detail.canonicalRules")}</summary>
            <ol className="grammar-rule-list [margin:0] [color:var(--text-soft)] [line-height:1.62] [padding-left:20px] [&_li_+_li]:[margin-top:8px]">
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
            <div className="grammar-example-list [display:grid] [grid-template-columns:1fr] [gap:8px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
              {examples.map((example) => (
                <div className="grammar-example learning-content [padding:14px_15px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [font-size:0.94rem] [line-height:1.55]" dir="auto" key={example}>
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
          <div className="grammar-detail-grid [display:grid] [grid-template-columns:1fr] [gap:10px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
            <section className="panel grammar-teaching-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:3px_0_0] [&_h2]:[font-size:1.05rem] [&_>_p:last-child]:[margin:0] [&_>_p:last-child]:[color:var(--text-soft)] [&_>_p:last-child]:[line-height:1.62]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.whyMatters")}</p>
              <h2 className="learning-content" lang="en" dir="ltr">
                {concept.title}
              </h2>
              <p className="learning-content" lang="en" dir="ltr">
                {concept.explanation || concept.shortDescription}
              </p>
            </section>
            {rules.length ? (
              <section className="panel grammar-teaching-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:flex] [flex-direction:column] [gap:12px] [&_h2]:[margin:3px_0_0] [&_h2]:[font-size:1.05rem] [&_>_p:last-child]:[margin:0] [&_>_p:last-child]:[color:var(--text-soft)] [&_>_p:last-child]:[line-height:1.62]">
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.pattern")}</p>
                <h2>{t("grammar.detail.rules")}</h2>
                <ol className="grammar-rule-list [margin:0] [color:var(--text-soft)] [line-height:1.62] [padding-left:20px] [&_li_+_li]:[margin-top:8px]">
                  {rules.map((rule) => (
                    <li key={rule} className="learning-content" dir="auto">
                      {rule}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <section className="panel grammar-lesson-missing [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.fullLesson")}</p>
            <h2>{t("grammar.detail.lessonMissing")}</h2>
            <p className="muted [color:var(--text-muted)]">{t("grammar.detail.lessonMissingHelp")}</p>
          </section>
        </>
      )}

      <section className="panel grammar-watch-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [flex-direction:column] [gap:12px] [&_h2]:[margin:3px_0_0] [&_h2]:[font-size:1.05rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.62] [display:grid] [grid-template-columns:24px_minmax(0,_1fr)] [align-items:start] [&_>_svg]:[color:var(--danger)] [&_ul]:[margin:10px_0_0] [&_ul]:[padding-left:18px] [&_ul]:[color:var(--text-muted)]">
        <CircleAlert size={20} />
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.quickWarning")}</p>
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
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.connections")}</p>
              <h2>{t("grammar.detail.whereFits")}</h2>
            </div>
            <Layers3 size={19} />
          </div>
          <div className="grammar-connection-list [display:grid] [grid-template-columns:1fr] [gap:8px] [&_a]:[min-height:58px] [&_a]:[display:flex] [&_a]:[flex-direction:column] [&_a]:[justify-content:center] [&_a]:[gap:3px] [&_a]:[padding:10px_12px] [&_a]:[border:1px_solid_var(--border)] [&_a]:[border-radius:13px] [&_a]:[background:var(--surface)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.65rem] [&_strong]:[font-size:0.8rem] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[940px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]">
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
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.yourVocabulary")}</p>
              <h2>{t("grammar.detail.reuseWords")}</h2>
            </div>
          </div>
          <p className="muted grammar-vocab-note [color:var(--text-muted)] [margin:-4px_0_0] [max-width:720px] [font-size:0.72rem] [line-height:1.5]">
            {t("grammar.detail.vocabHelp")}
          </p>
          <div className="grammar-vocab-grid [display:grid] [grid-template-columns:1fr] [gap:8px] [&_a]:[min-height:58px] [&_a]:[display:flex] [&_a]:[flex-direction:column] [&_a]:[justify-content:center] [&_a]:[gap:3px] [&_a]:[padding:10px_12px] [&_a]:[border:1px_solid_var(--border)] [&_a]:[border-radius:13px] [&_a]:[background:var(--surface)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.65rem] [&_strong]:[font-size:0.8rem] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[940px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]">
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
        <details className="grammar-evidence-disclosure [padding:0] [overflow:hidden] [&_>_summary]:[min-height:62px] [&_>_summary]:[display:flex] [&_>_summary]:[align-items:center] [&_>_summary]:[padding:12px_14px] [&_>_summary]:[list-style:none] [&_>_summary::-webkit-details-marker]:[display:none] [&_summary_span]:[display:flex] [&_summary_span]:[flex-direction:column] [&_summary_span]:[gap:3px] [&_summary_strong]:[color:var(--text)] [&_summary_strong]:[font-size:0.85rem] [&_summary_small]:[color:var(--text-muted)] [&_summary_small]:[font-size:0.65rem]">
          <summary>
            <span>
              <strong>{t("grammar.detail.evidenceWhy")}</strong>
              <small>{t("grammar.detail.evidenceHelp")}</small>
            </span>
          </summary>
          <div className="grammar-evidence-list [padding:0_14px_14px] [&_>_div]:[padding:10px_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div_>_div]:[display:flex] [&_>_div_>_div]:[justify-content:space-between] [&_>_div_>_div]:[gap:12px] [&_strong]:[font-size:0.68rem] [&_span]:[font-size:0.68rem] [&_small]:[font-size:0.68rem] [&_span]:[color:var(--text-muted)] [&_small]:[color:var(--text-muted)]">
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
        <section className="grammar-related [display:flex] [flex-wrap:wrap] [align-items:center] [gap:8px] [&_>_p]:[width:100%] [&_a]:[min-height:38px] [&_a]:[display:inline-flex] [&_a]:[align-items:center] [&_a]:[gap:6px] [&_a]:[padding:0_10px] [&_a]:[border:1px_solid_var(--border)] [&_a]:[border-radius:999px] [&_a]:[color:var(--text-soft)] [&_a]:[font-size:0.7rem]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.detail.related")}</p>
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
