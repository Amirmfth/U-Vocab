import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Network,
} from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { toDate } from "@/lib/relative-time";
import { startOperation } from "@/lib/performance";
import {
  getCachedWordPrimary,
  getCachedWordSecondary,
} from "@/lib/cached-data";
import { createTranslator, type MessageKey } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/i18n/format";
import { getServerTranslator } from "@/i18n/server";
import {
  WordExampleMeaning,
  WordLanguageProvider,
  WordLanguageSwitch,
  WordMeaning,
} from "./WordLanguage";
import { VerbConjugation } from "./VerbConjugation";
import { ExampleGenerationPanel } from "./ExampleGenerationPanel";
import { TeachWordSheet } from "./TeachWordSheet";
import { WordPageScrollReset } from "./WordPageScrollReset";
import { rerankLexicalEdges } from "@/lib/ai/decisions/lexical-edge-reranker";

type PrimaryWord = NonNullable<Awaited<ReturnType<typeof getCachedWordPrimary>>>;

const stateKeys: Record<string, MessageKey> = {
  NEW: "vocab.state.new",
  LEARNING: "vocab.state.learning",
  FAMILIAR: "vocab.state.familiar",
  ACTIVE: "vocab.state.active",
  MASTERED: "vocab.state.mastered",
  MAINTENANCE: "vocab.state.maintenance",
};

const partOfSpeechKeys: Record<string, MessageKey> = {
  NOUN: "vocab.pos.noun",
  VERB: "vocab.pos.verb",
  ADJECTIVE: "vocab.pos.adjective",
  ADVERB: "vocab.pos.adverb",
  PRONOUN: "vocab.pos.pronoun",
  PREPOSITION: "vocab.pos.preposition",
  CONJUNCTION: "vocab.pos.conjunction",
  INTERJECTION: "vocab.pos.interjection",
  PHRASE: "vocab.pos.phrase",
  OTHER: "vocab.pos.other",
};

const relationKeys: Record<string, MessageKey> = {
  WORD_FAMILY: "word.relation.word_family",
  SYNONYM: "word.relation.synonym",
  ANTONYM: "word.relation.antonym",
  DERIVED: "word.relation.derived",
  RELATED: "word.relation.related",
  COLLOCATION: "word.relation.collocation",
  PHRASE: "word.relation.phrase",
};

const grammarRelationKeys: Record<string, MessageKey> = {
  EXEMPLIFIES: "word.grammarRelation.exemplifies",
  GOVERNS: "word.grammarRelation.governs",
  TRIGGERS: "word.grammarRelation.triggers",
  COMMON_WITH: "word.grammarRelation.common_with",
};

const ratingKeys: Record<string, MessageKey> = {
  AGAIN: "word.rating.again",
  HARD: "word.rating.hard",
  GOOD: "word.rating.good",
  EASY: "word.rating.easy",
};

const mistakeKeys: Record<string, MessageKey> = {
  ARTICLE: "mistake.type.article",
  CASE: "mistake.type.case",
  PREPOSITION: "mistake.type.preposition",
  REFLEXIVE: "mistake.type.reflexive",
  COLLOCATION: "mistake.type.collocation",
  ADJECTIVE_ENDING: "mistake.type.adjective_ending",
  VERB_POSITION: "mistake.type.verb_position",
  WORD_ORDER: "mistake.type.word_order",
  TENSE: "mistake.type.tense",
  CONJUGATION: "mistake.type.conjugation",
  PRONOUN: "mistake.type.pronoun",
  AGREEMENT: "mistake.type.agreement",
  RELATIVE_CLAUSE: "mistake.type.relative_clause",
  PASSIVE: "mistake.type.passive",
  SUBJUNCTIVE: "mistake.type.subjunctive",
  WORD_CHOICE: "mistake.type.word_choice",
  WORD_FORM: "mistake.type.word_form",
  SPELLING: "mistake.type.spelling",
  OTHER: "mistake.type.other",
};

function GrammarAndUsage({
  patterns,
  locale,
  targetLanguageCode,
}: {
  patterns: PrimaryWord["patterns"];
  locale: UiLocale;
  targetLanguageCode: string;
}) {
  const t = createTranslator(locale);
  return (
    <details className="panel word-detail-card word-detail-disclosure [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [&_h2]:[margin-bottom:10px] [padding:0] [&_>_summary]:[min-height:58px] [&_>_summary]:[display:flex] [&_>_summary]:[align-items:center] [&_>_summary]:[justify-content:space-between] [&_>_summary]:[gap:12px] [&_>_summary]:[padding:13px_15px] [&_>_summary]:[list-style:none] [&_>_summary::-webkit-details-marker]:[display:none] [&_>_summary_span:first-child]:[display:flex] [&_>_summary_span:first-child]:[flex-direction:column] [&_>_summary_span:first-child]:[gap:3px] [&_>_summary_strong]:[color:var(--text)] [&_>_summary_strong]:[font-size:0.9rem]" open>
      <summary>
        <span>
          <strong>{t("word.grammarUsage")}</strong>
        </span>
        <span className="disclosure-hint [color:var(--text-muted)] [font-size:0.66rem]">
          {t("word.savedCount", { count: formatNumber(locale, patterns.length) })}
        </span>
      </summary>
      <div className="word-disclosure-content [padding:0_15px_15px]">
        {patterns.length ? (
          patterns.map((pattern) => (
            <div className="pattern-block [&_+_.pattern-block]:[padding-top:12px] [&_+_.pattern-block]:[border-top:1px_solid_var(--border)]" key={pattern.id}>
              <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                {pattern.pattern}
              </strong>
              {pattern.explanation ? (
                <p className="muted learning-content [color:var(--text-muted)]" dir="auto">
                  {pattern.explanation}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted [color:var(--text-muted)]">{t("word.noPatterns")}</p>
        )}
      </div>
    </details>
  );
}

function LexicalGrammarLinks({
  links,
  locale,
  targetLanguageCode,
}: {
  links: NonNullable<
    Awaited<ReturnType<typeof getCachedWordSecondary>>
  >["grammarLinks"];
  locale: UiLocale;
  targetLanguageCode: string;
}) {
  if (!links.length) return null;
  const t = createTranslator(locale);

  return (
    <section className="panel word-detail-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [padding:15px] [&_h2]:[margin-bottom:10px]">
      <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.grammarEyebrow")}</p>
          <h2>{t("word.structures")}</h2>
        </div>
        <Brain size={19} />
      </div>
      <div className="grammar-link-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
        {links.map((link) => (
          <Link
            href={"/grammar/" + link.grammarConcept.slug}
            className="grammar-link-row [min-height:62px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_18px] [align-items:center] [gap:10px] [padding:10px_0] [&_+_.grammar-link-row]:[border-top:1px_solid_var(--border)] [&_>_span:first-child]:[min-width:0] [&_>_span:first-child]:[display:flex] [&_>_span:first-child]:[flex-direction:column] [&_>_span:first-child]:[gap:3px] [&_strong]:[font-size:0.82rem] [&_small]:[overflow:hidden] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_>_svg]:[color:var(--text-muted)]"
            key={link.id}
            prefetch
          >
            <span>
              <strong className="learning-content" lang="en" dir="ltr">
                {link.grammarConcept.title}
              </strong>
              <small className="learning-content" lang={targetLanguageCode} dir="auto">
                {link.lexicalPattern?.pattern ??
                  link.note ??
                  t(
                    grammarRelationKeys[link.relationType] ??
                      "word.grammarRelation.exemplifies",
                  )}
              </small>
            </span>
            <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{link.grammarConcept.introducedAt}</span>
            <ArrowRight className="rtl-mirror" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function WordMastery({
  state,
  locale,
}: {
  state: PrimaryWord["userStates"][number];
  locale: UiLocale;
}) {
  const t = createTranslator(locale);
  const scores = [
    [t("word.recognition"), state.recognition],
    [t("word.meaningRecall"), state.meaningRecall],
    [t("word.production"), state.production],
    [t("word.context"), state.contextualUsage],
  ] as const;
  const overall =
    scores.reduce((sum, [, value]) => sum + Number(value), 0) / scores.length;

  return (
    <section className="panel word-detail-card word-mastery-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [padding:15px] [&_h2]:[margin-bottom:10px]">
      <h2>{t("word.mastery")}</h2>
      <p className="muted [color:var(--text-muted)]">
        {t("word.overallMastery", {
          percent: formatPercent(locale, overall),
        })}
      </p>
      {scores.map(([label, value]) => {
        const score = Math.round(Number(value) * 100);
        return (
          <div className="mastery-row [display:flex] [flex-direction:column] [gap:7px] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[justify-content:space-between] [&_>_div:first-child]:[gap:12px] [&_>_div:first-child]:[color:var(--text-soft)] [&_>_div:first-child]:[font-size:0.8rem] [&_strong]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_strong]:[font-size:0.75rem]" key={label}>
            <div>
              <span>{label}</span>
              <strong>{formatPercent(locale, Number(value))}</strong>
            </div>
            <div className="metric-bar [height:7px] [overflow:hidden] [border-radius:999px] [background:var(--surface-soft)] [&_>_span]:[display:block] [&_>_span]:[height:100%] [&_>_span]:[border-radius:inherit] [&_>_span]:[background:var(--primary)]">
              <span style={{ width: score + "%" }} />
            </div>
          </div>
        );
      })}
      {state.nextReviewAt ? (
        <p
          className="muted [color:var(--text-muted)]"
          title={formatDate(locale, toDate(state.nextReviewAt), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        >
          {t("word.nextReview", {
            time: formatRelativeTime(locale, toDate(state.nextReviewAt)),
          })}
        </p>
      ) : null}
    </section>
  );
}

function SecondaryWordSkeleton({ locale }: { locale: UiLocale }) {
  const t = createTranslator(locale);
  return (
    <>
      <section
        className="page-section [display:flex] [flex-direction:column] [gap:12px]"
        aria-busy="true"
        aria-label={t("word.loadingDetails")}
      >
        <div className="skeleton loading-section-heading [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:130px] [height:25px]" />
        <div className="loading-example-grid [display:grid] [gap:12px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
          <div className="skeleton loading-example-card [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:150px] [border-radius:14px]" />
          <div className="skeleton loading-example-card [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:150px] [border-radius:14px]" />
        </div>
      </section>
      <div className="skeleton loading-word-disclosure [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:70px] [border-radius:14px]" aria-hidden="true" />
      <div className="skeleton loading-word-disclosure [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:70px] [border-radius:14px]" aria-hidden="true" />
    </>
  );
}

async function DeferredWordDetails({
  userId,
  userCourseId,
  lexemeId,
  level,
  patterns,
  primaryState,
  locale,
  targetLanguageCode,
  currentLevel,
  targetLevel,
}: {
  userId: string;
  userCourseId: string;
  lexemeId: string;
  level: string;
  patterns: PrimaryWord["patterns"];
  primaryState: PrimaryWord["userStates"][number];
  locale: UiLocale;
  targetLanguageCode: string;
  currentLevel: string;
  targetLevel: string;
}) {
  const word = await getCachedWordSecondary(
    userId,
    userCourseId,
    lexemeId,
    level,
  );
  if (!word) return null;

  const t = createTranslator(locale);
  const state = word.userStates[0];

  const personalizedRelations = await rerankLexicalEdges({
    userId,
    userCourseId,
    sourceLexemeId: word.id,
    sourceMastery: {
      recognition: primaryState.recognition,
      meaningRecall: primaryState.meaningRecall,
      production: primaryState.production,
      contextualUsage: primaryState.contextualUsage,
    },
    currentLevel,
    targetLevel,
    mistakeTypes: word.mistakes
      .filter((mistake) => !mistake.resolvedAt)
      .map((mistake) => mistake.type),
    surface: "word_detail",
    candidates: word.outgoing.map((relation) => ({
      relationId: relation.id,
      relationType: relation.type,
      targetLexemeId: relation.targetId,
      targetLemma: relation.target.lemma,
      targetCefrLevel: relation.target.cefrLevel,
      targetKnownState: relation.target.userStates[0]?.state ?? "UNKNOWN",
      recentEncounter: relation.target.encounters.length > 0,
      recurringConfusion: false,
    })),
    relations: word.outgoing,
  });

  return (
    <>
      <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <h2>{t("word.examples")}</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        {word.examples.length ? (
          <div className="grid [display:grid] [grid-template-columns:1fr] [gap:12px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[940px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]">
            {word.examples.slice(0, 4).map((example) => (
              <article className="card example-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [transition:border-color_160ms_ease,_transform_160ms_ease,_background_160ms_ease] [a&:active]:[transform:scale(0.985)] min-[940px]:[a&:hover]:[transform:translateY(-2px)] min-[940px]:[a&:hover]:[border-color:var(--border-strong)] min-[940px]:[a&:hover]:[background:var(--surface-raised)] [display:flex] [flex-direction:column] [gap:10px] [&_>_p]:[margin:0] [&_>_p]:[line-height:1.55] [&_>_strong]:[margin:0] [&_>_strong]:[line-height:1.55] [border-radius:18px]" key={example.id}>
                <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
                  {example.level ? (
                    <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{example.level}</span>
                  ) : null}
                  {example.register ? (
                    <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{example.register}</span>
                  ) : null}
                </div>
                <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {example.targetText}
                </strong>
                <WordExampleMeaning
                  english={example.english}
                  persian={example.persian}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="muted [color:var(--text-muted)]">{t("word.noExamples")}</p>
        )}
        <ExampleGenerationPanel
          lexemeId={word.id}
          hasExamples={word.examples.length > 0}
        />
      </section>

      <GrammarAndUsage
        patterns={patterns}
        locale={locale}
        targetLanguageCode={targetLanguageCode}
      />
      <LexicalGrammarLinks links={word.grammarLinks} locale={locale} targetLanguageCode={targetLanguageCode} />

      <WordMastery state={primaryState} locale={locale} />

      {personalizedRelations.relations.length ? (
        <section className="panel intelligence-panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] max-[619px]:[scroll-margin-top:76px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <h2>{t("word.connections")}</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="relation-list [display:flex] [flex-wrap:wrap] [gap:8px]">
            {personalizedRelations.relations.map((relation) => (
              <Link
                href={"/vocabulary/" + relation.target.id}
                className="relation-chip [min-height:48px] [min-width:110px] [display:inline-flex] [flex-direction:column] [justify-content:center] [gap:3px] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[font-weight:600] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem]"
                key={relation.id}
                prefetch
              >
                <span className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {relation.target.lemma}
                </span>
                <small>
                  {relationKeys[relation.type]
                    ? t(relationKeys[relation.type])
                    : relation.type.replaceAll("_", " ").toLowerCase()}
                </small>
              </Link>
            ))}
          </div>

          <Link href="/vocabulary" className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]" prefetch>
            {t("word.browseVocabulary")}{" "}
            <ArrowRight className="rtl-mirror" size={16} />
          </Link>
        </section>
      ) : null}

      <details className="word-history-disclosure [&_>_summary]:[min-height:58px] [&_>_summary]:[display:flex] [&_>_summary]:[align-items:center] [&_>_summary]:[justify-content:space-between] [&_>_summary]:[gap:12px] [&_>_summary]:[padding:13px_15px] [&_>_summary]:[list-style:none] [&_>_summary::-webkit-details-marker]:[display:none] [&_>_summary_span:first-child]:[display:flex] [&_>_summary_span:first-child]:[flex-direction:column] [&_>_summary_span:first-child]:[gap:3px] [&_>_summary_strong]:[color:var(--text)] [&_>_summary_strong]:[font-size:0.9rem] [&_summary_small]:[color:var(--text-muted)] [&_summary_small]:[font-size:0.66rem] [padding:0] [overflow:hidden] [border:1px_solid_var(--border)] [border-radius:16px] [background:var(--surface)] [&_.word-history-grid]:[padding:0_10px_10px] [&_.word-detail-card]:[box-shadow:none] max-[619px]:[scroll-margin-top:76px]">
        <summary>
          <span>
            <strong>{t("word.historyTitle")}</strong>
            <small>{t("word.historyHelp")}</small>
          </span>
        </summary>
        <section className="word-history-grid [display:grid] [grid-template-columns:1fr] [gap:12px] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
          <article className="panel word-detail-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [padding:15px] [&_h2]:[margin-bottom:10px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.reviewHistory")}</p>
            <h2>{t("word.recentReviews")}</h2>
            {state?.reviews.length ? (
              <div className="history-list [display:flex] [flex-direction:column]">
                {state.reviews.map((review) => (
                  <div className="history-row [min-height:42px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:8px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_small]:[color:var(--text-muted)] [&_small]:[text-align:right] [&.stacked]:[align-items:flex-start] [&.stacked]:[flex-direction:column] [&.stacked]:[gap:3px]" key={review.id}>
                    <span>
                      {ratingKeys[review.rating]
                        ? t(ratingKeys[review.rating])
                        : review.rating.toLowerCase()}
                    </span>
                    <small>
                      {formatDate(locale, toDate(review.reviewedAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted [color:var(--text-muted)]">{t("word.noReviews")}</p>
            )}
          </article>

          <article className="panel word-detail-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [padding:15px] [&_h2]:[margin-bottom:10px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.encounters")}</p>
            <h2>{t("word.whereMet")}</h2>
            {word.encounters.length ? (
              <div className="history-list [display:flex] [flex-direction:column]">
                {word.encounters.map((encounter) => (
                  <div className="history-row [min-height:42px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:8px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_small]:[color:var(--text-muted)] [&_small]:[text-align:right] [&.stacked]:[align-items:flex-start] [&.stacked]:[flex-direction:column] [&.stacked]:[gap:3px]" key={encounter.id}>
                    <span>{encounter.source}</span>
                    <small>
                      {formatDate(locale, toDate(encounter.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted [color:var(--text-muted)]">{t("word.noEncounters")}</p>
            )}
          </article>

          <article className="panel word-detail-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:4px_0_0] [&_h2]:[letter-spacing:-0.03em] [border-radius:18px] [padding:15px] [&_h2]:[margin-bottom:10px]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.mistakeMemory")}</p>
            <h2>{t("word.recurringWeaknesses")}</h2>
            {word.mistakes.length ? (
              <div className="history-list [display:flex] [flex-direction:column]">
                {word.mistakes.map((mistake) => (
                  <div className="history-row stacked [min-height:42px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:8px_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0] [&_span]:[color:var(--text-soft)] [&_span]:[text-transform:capitalize] [&_small]:[color:var(--text-muted)] [&_small]:[text-align:right] [&.stacked]:[align-items:flex-start] [&.stacked]:[flex-direction:column] [&.stacked]:[gap:3px]" key={mistake.id}>
                    <span>
                      {mistakeKeys[mistake.type]
                        ? t(mistakeKeys[mistake.type])
                        : mistake.type.replaceAll("_", " ").toLowerCase()}{" "}
                      · {formatNumber(locale, mistake.occurrences)}×
                    </span>
                    <small className="learning-content" dir="auto">
                      {mistake.resolvedAt
                        ? t("word.resolved")
                        : mistake.explanation ?? t("word.open")}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted [color:var(--text-muted)]">{t("word.noMistakes")}</p>
            )}
          </article>
        </section>
      </details>
    </>
  );
}

export default async function Word({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const perf = startOperation("page.word_detail");
  const [{ id }, user, course] = await Promise.all([
    params,
    perf.span("auth", () => getCurrentUser()),
    perf.span("course", () => getCurrentCourse()),
  ]);
  const { locale, t } = await getServerTranslator(user);
  const targetLanguageCode = targetLanguageConfig(course.targetLanguage).code;

  const word = await perf.span("dbRead", () =>
    getCachedWordPrimary(user.id, course.id, id),
  );

  if (!word || word.userStates.length === 0) {
    perf.success({ found: false });
    notFound();
  }

  const state = word.userStates[0];
  perf.success({
    found: true,
    primaryPatternCount: word.patterns.length,
  });

  return (
    <main className="page word-detail-page [display:flex] [flex-direction:column] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [gap:18px] [&_.word-detail-topline]:[display:grid] [&_.word-detail-topline]:[grid-template-columns:minmax(0,_1fr)_auto] [&_.word-detail-topline]:[align-items:start] [&_.word-detail-topline]:[gap:12px] [&_.word-detail-topline_.word-meta]:[min-width:0] [&_.word-primary-actions]:[margin-top:2px] [&_.word-quick-actions]:[gap:7px] [&_.word-quick-actions_>_*]:[min-height:var(--tap-target)] [&_.word-detail-grid]:[gap:10px] [&_.word-detail-card]:[border-color:var(--border)] [&_.word-detail-card]:[background:var(--surface)] [&_.word-detail-card_.eyebrow]:[margin-bottom:2px] [&_.lesson-meaning]:[font-size:1.18rem] [&_.mastery-row]:[gap:6px] [&_.intelligence-panel]:[border-color:var(--border)] [&_.example-card]:[min-height:150px] [&_.example-card_>_strong]:[font-size:1rem] [&_.example-card_>_strong]:[line-height:1.6] [&_.relation-chip]:[transition:border-color_140ms_ease,_background_140ms_ease,_transform_140ms_ease] min-[620px]:[&_.word-primary-actions]:[align-items:flex-start] min-[940px]:[&_.word-detail-grid]:[grid-template-columns:minmax(0,_1.15fr)_minmax(300px,_0.85fr)] min-[940px]:[&_.word-detail-grid]:[align-items:start] min-[940px]:[&_.word-detail-disclosure]:[grid-column:1_/_-1] min-[940px]:[&_.relation-chip:hover]:[border-color:var(--border-strong)] min-[940px]:[&_.relation-chip:hover]:[background:var(--surface-soft)] min-[940px]:[&_.relation-chip:hover]:[transform:translateY(-1px)]">
      <WordLanguageProvider
        preference={course.explanationLanguage}
        targetLanguageCode={targetLanguageCode}
      >
        <WordPageScrollReset wordId={word.id} />
        <section className="page-header word-identity-hero [display:flex] [flex-direction:column] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [padding-top:16px] [position:relative] [gap:14px] [overflow:hidden] [padding:20px] [border:1px_solid_var(--border)] [border-radius:var(--radius-lg)] [background:radial-gradient(circle_at_100%_0%,_rgba(139,_124,_255,_0.11),_transparent_40%),_linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [&_h1]:[max-width:900px] [&_h1]:[font-size:clamp(2.2rem,_8vw,_4.6rem)] [&_h1]:[line-height:1.02] [&_h1]:[letter-spacing:-0.065em] [&_h1]:[overflow-wrap:anywhere] [&_.page-description]:[color:var(--text-muted)] [&_.page-description]:[font-size:0.82rem] min-[620px]:[padding:26px] min-[940px]:[padding:30px]">
          <div className="word-detail-topline [display:flex] [flex-direction:column] [gap:10px] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[justify-content:space-between] max-[619px]:[align-items:flex-start] max-[619px]:[&_.word-meta]:[gap:5px] max-[619px]:[&_.badge:nth-child(n_+_3)]:[display:none]">
            <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
              <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
                {partOfSpeechKeys[word.partOfSpeech]
                  ? t(partOfSpeechKeys[word.partOfSpeech])
                  : word.partOfSpeech.toLowerCase()}
              </span>
              <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">
                {stateKeys[state.state]
                  ? t(stateKeys[state.state])
                  : state.state.toLowerCase()}
              </span>
              <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{course.targetLevel}</span>
            </div>
            <WordLanguageSwitch />
          </div>

          <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
            {formatLexemeLabel(word)}
          </h1>

          {word.plural ? (
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">
              {t("word.plural", { value: word.plural })}
            </p>
          ) : null}

          <div className="word-hero-meanings [margin-top:4px] [padding-top:18px] [border-top:1px_solid_var(--border)]">
            <div className="word-hero-meaning-list [display:flex] [flex-wrap:wrap] [gap:16px_32px]">
              <WordMeaning
                translations={word.translations}
                definitions={word.definitions}
              />
            </div>
          </div>
        </section>

        <nav className="word-detail-actions [display:flex] [flex-wrap:wrap] [gap:8px] [&_>_.button]:[flex:1_1_165px] [&_>_.button]:[min-height:var(--tap-target)] [&_>_.word-quick-action-button]:[flex:1_1_165px] [&_>_.word-quick-action-button]:[min-height:var(--tap-target)]" aria-label={t("word.actions")}>
          <TeachWordSheet lexemeId={word.id} label={formatLexemeLabel(word)} />
          <Link
            href={"/practice?lexeme=" + word.id}
            className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
            prefetch
          >
            <Brain size={17} /> {t("word.practice")}
          </Link>
          {word.partOfSpeech === "VERB" && course.targetLanguage === "GERMAN" ? (
            <VerbConjugation lexemeId={word.id} userScope={course.id} />
          ) : null}
        </nav>

        <Suspense fallback={<SecondaryWordSkeleton locale={locale} />}>
          <DeferredWordDetails
            userId={user.id}
            userCourseId={course.id}
            lexemeId={word.id}
            level={course.targetLevel}
            patterns={word.patterns}
            primaryState={state}
            locale={locale}
            targetLanguageCode={targetLanguageCode}
            currentLevel={course.currentLevel}
            targetLevel={course.targetLevel}
          />
        </Suspense>
      </WordLanguageProvider>
    </main>
  );
}
