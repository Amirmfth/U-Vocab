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
    <details className="panel word-detail-card word-detail-disclosure border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c in-h2:mb-2.5 p-0 in-summary-2:min-h-14.5 in-summary-2:flex in-summary-2:items-center in-summary-2:justify-between in-summary-2:gap-3 in-summary-2:padding-13px-15px in-summary-2:list-none in-summary-webkit-details-marker:hidden in-summary-span-first-child:flex in-summary-span-first-child:flex-col in-summary-span-first-child:gap-0.75 in-summary-strong-2:text-uv-text in-summary-strong-2:text-uv-fee84419642" open>
      <summary>
        <span>
          <strong>{t("word.grammarUsage")}</strong>
        </span>
        <span className="disclosure-hint text-uv-text-muted text-uv-ff7862da171">
          {t("word.savedCount", { count: formatNumber(locale, patterns.length) })}
        </span>
      </summary>
      <div className="word-disclosure-content padding-0-15px-15px">
        {patterns.length ? (
          patterns.map((pattern) => (
            <div className="pattern-block in-pattern-block:pt-3 in-pattern-block:border-1px-solid-border-3" key={pattern.id}>
              <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                {pattern.pattern}
              </strong>
              {pattern.explanation ? (
                <p className="muted learning-content text-uv-text-muted" dir="auto">
                  {pattern.explanation}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted text-uv-text-muted">{t("word.noPatterns")}</p>
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
    <section className="panel word-detail-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c p-3.75 in-h2:mb-2.5">
      <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.grammarEyebrow")}</p>
          <h2>{t("word.structures")}</h2>
        </div>
        <Brain size={19} />
      </div>
      <div className="grammar-link-list flex flex-col border-1px-solid-border-3">
        {links.map((link) => (
          <Link
            href={"/grammar/" + link.grammarConcept.slug}
            className="grammar-link-row min-h-15.5 grid grid-template-columns-minmax-0-1fr-auto-18px items-center gap-2.5 padding-10px-0 in-grammar-link-row:border-1px-solid-border-3 in-span-first-child:min-w-0 in-span-first-child:flex in-span-first-child:flex-col in-span-first-child:gap-0.75 in-strong-2:text-uv-fa2582d5d6e in-small:overflow-hidden in-small:text-uv-text-muted in-small:text-uv-ff7862da171 in-small:text-overflow-ellipsis in-small:whitespace-nowrap in-svg:text-uv-text-muted"
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
            <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{link.grammarConcept.introducedAt}</span>
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
    <section className="panel word-detail-card word-mastery-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c p-3.75 in-h2:mb-2.5">
      <h2>{t("word.mastery")}</h2>
      <p className="muted text-uv-text-muted">
        {t("word.overallMastery", {
          percent: formatPercent(locale, overall),
        })}
      </p>
      {scores.map(([label, value]) => {
        const score = Math.round(Number(value) * 100);
        return (
          <div className="mastery-row flex flex-col gap-1.75 in-div-first-child:flex in-div-first-child:justify-between in-div-first-child:gap-3 in-div-first-child:text-uv-text-soft in-div-first-child:text-uv-f6c2d68ddb8 in-strong-2:font-font-geist-mono-geist-mono-monospace in-strong-2:text-uv-f823f1262bd" key={label}>
            <div>
              <span>{label}</span>
              <strong>{formatPercent(locale, Number(value))}</strong>
            </div>
            <div className="metric-bar h-1.75 overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft in-span-2:block in-span-2:h-full in-span-2:rounded-uv-r3e26d67509 in-span-2:bg-uv-primary">
              <span style={{ width: score + "%" }} />
            </div>
          </div>
        );
      })}
      {state.nextReviewAt ? (
        <p
          className="muted text-uv-text-muted"
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
        className="page-section flex flex-col gap-3"
        aria-busy="true"
        aria-label={t("word.loadingDetails")}
      >
        <div className="skeleton loading-section-heading rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite w-32.5 h-6.25" />
        <div className="loading-example-grid grid gap-3 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
          <div className="skeleton loading-example-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-37.5 rounded-uv-rd65225386d" />
          <div className="skeleton loading-example-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-37.5 rounded-uv-rd65225386d" />
        </div>
      </section>
      <div className="skeleton loading-word-disclosure bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
      <div className="skeleton loading-word-disclosure bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
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
      <section className="page-section flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <h2>{t("word.examples")}</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        {word.examples.length ? (
          <div className="grid grid grid-template-columns-1fr gap-3 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:grid-template-columns-repeat-3-minmax-0-1fr">
            {word.examples.slice(0, 4).map((example) => (
              <article className="card example-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 transition-border-color-160ms-ease-transform-160ms-ease-backgro in-a-active:transform-scale-0p985 uv-min940:in-a-hover-2:transform-translatey-2px uv-min940:in-a-hover-2:border-uv-border-strong uv-min940:in-a-hover-2:bg-uv-surface-raised flex flex-col gap-2.5 in-p:m-0 in-p:line-height-1p55 in-strong:m-0 in-strong:line-height-1p55 rounded-uv-r6d27d54c6c" key={example.id}>
                <div className="word-meta flex flex-wrap gap-1.75 items-center">
                  {example.level ? (
                    <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{example.level}</span>
                  ) : null}
                  {example.register ? (
                    <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{example.register}</span>
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
          <p className="muted text-uv-text-muted">{t("word.noExamples")}</p>
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
        <section className="panel intelligence-panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c uv-max619:scroll-margin-top-76px">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <h2>{t("word.connections")}</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="relation-list flex flex-wrap gap-2">
            {personalizedRelations.relations.map((relation) => (
              <Link
                href={"/vocabulary/" + relation.target.id}
                className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 padding-8px-12px border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-span:font-semibold in-small:text-uv-text-muted in-small:text-uv-ff7862da171"
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

          <Link href="/vocabulary" className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5" prefetch>
            {t("word.browseVocabulary")}{" "}
            <ArrowRight className="rtl-mirror" size={16} />
          </Link>
        </section>
      ) : null}

      <details className="word-history-disclosure in-summary-2:min-h-14.5 in-summary-2:flex in-summary-2:items-center in-summary-2:justify-between in-summary-2:gap-3 in-summary-2:padding-13px-15px in-summary-2:list-none in-summary-webkit-details-marker:hidden in-summary-span-first-child:flex in-summary-span-first-child:flex-col in-summary-span-first-child:gap-0.75 in-summary-strong-2:text-uv-text in-summary-strong-2:text-uv-fee84419642 in-summary-small:text-uv-text-muted in-summary-small:text-uv-ff7862da171 p-0 overflow-hidden border-1px-solid-border-2 rounded-uv-r4678bd4d8a bg-uv-surface in-word-history-grid:padding-0-10px-10px in-word-detail-card:box-shadow-none uv-max619:scroll-margin-top-76px">
        <summary>
          <span>
            <strong>{t("word.historyTitle")}</strong>
            <small>{t("word.historyHelp")}</small>
          </span>
        </summary>
        <section className="word-history-grid grid grid-template-columns-1fr gap-3 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr">
          <article className="panel word-detail-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c p-3.75 in-h2:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.reviewHistory")}</p>
            <h2>{t("word.recentReviews")}</h2>
            {state?.reviews.length ? (
              <div className="history-list flex flex-col">
                {state.reviews.map((review) => (
                  <div className="history-row min-h-10.5 flex items-center justify-between gap-3 padding-8px-0 border-1px-solid-border last:border-0-3 in-span:text-uv-text-soft in-span:capitalize in-small:text-uv-text-muted in-small:text-right in-stacked:items-start in-stacked:flex-col in-stacked:gap-0.75" key={review.id}>
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
              <p className="muted text-uv-text-muted">{t("word.noReviews")}</p>
            )}
          </article>

          <article className="panel word-detail-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c p-3.75 in-h2:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.encounters")}</p>
            <h2>{t("word.whereMet")}</h2>
            {word.encounters.length ? (
              <div className="history-list flex flex-col">
                {word.encounters.map((encounter) => (
                  <div className="history-row min-h-10.5 flex items-center justify-between gap-3 padding-8px-0 border-1px-solid-border last:border-0-3 in-span:text-uv-text-soft in-span:capitalize in-small:text-uv-text-muted in-small:text-right in-stacked:items-start in-stacked:flex-col in-stacked:gap-0.75" key={encounter.id}>
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
              <p className="muted text-uv-text-muted">{t("word.noEncounters")}</p>
            )}
          </article>

          <article className="panel word-detail-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 flex flex-col gap-3.5 in-h2:margin-4px-0-0 in-h2:letter-spacing-0p03em rounded-uv-r6d27d54c6c p-3.75 in-h2:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.mistakeMemory")}</p>
            <h2>{t("word.recurringWeaknesses")}</h2>
            {word.mistakes.length ? (
              <div className="history-list flex flex-col">
                {word.mistakes.map((mistake) => (
                  <div className="history-row stacked min-h-10.5 flex items-center justify-between gap-3 padding-8px-0 border-1px-solid-border last:border-0-3 in-span:text-uv-text-soft in-span:capitalize in-small:text-uv-text-muted in-small:text-right in-stacked:items-start in-stacked:flex-col in-stacked:gap-0.75" key={mistake.id}>
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
              <p className="muted text-uv-text-muted">{t("word.noMistakes")}</p>
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
    <main className="page word-detail-page flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 w-full gap-4.5 in-word-detail-topline:grid in-word-detail-topline:grid-template-columns-minmax-0-1fr-auto in-word-detail-topline:items-start in-word-detail-topline:gap-3 in-word-detail-topline-word-meta:min-w-0 in-word-primary-actions:mt-0.5 in-word-quick-actions:gap-1.75 in-word-quick-actions-descendants:min-height-tap-target in-word-detail-grid:gap-2.5 in-word-detail-card:border-uv-border in-word-detail-card:bg-uv-surface in-word-detail-card-eyebrow:mb-0.5 in-lesson-meaning:text-uv-f1fba8b9d92 in-mastery-row:gap-1.5 in-intelligence-panel:border-uv-border in-example-card:min-h-37.5 in-example-card-strong:text-uv-f19feeb881c in-example-card-strong:line-height-1p6 in-relation-chip:transition-border-color-140ms-ease-background-140ms-ease-transf uv-min620:in-word-primary-actions:items-start uv-min940:in-word-detail-grid:grid-template-columns-minmax-0-1p15fr-minmax-300px-0p85fr uv-min940:in-word-detail-grid:items-start uv-min940:in-word-detail-disclosure:grid-column-1-1 uv-min940:in-relation-chip-hover:border-uv-border-strong uv-min940:in-relation-chip-hover:bg-uv-surface-soft uv-min940:in-relation-chip-hover:transform-translatey-1px">
      <WordLanguageProvider
        preference={course.explanationLanguage}
        targetLanguageCode={targetLanguageCode}
      >
        <WordPageScrollReset wordId={word.id} />
        <section className="page-header word-identity-hero flex flex-col in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 pt-4 relative gap-3.5 overflow-hidden p-5 border-1px-solid-border-2 rounded-uv-r02a0a889dd bg-radial-gradient-circle-at-100pct-0pct-rgb-139-124-255-0p11-t in-h1:max-w-uv-0927635a28 in-h1:text-uv-fd2f79ab33d in-h1:line-height-1p02 in-h1:letter-spacing-0p065em in-h1:overflow-wrap-anywhere in-page-description:text-uv-text-muted in-page-description:text-uv-fa2582d5d6e uv-min620:p-6.5 uv-min940:p-7.5">
          <div className="word-detail-topline flex flex-col gap-2.5 uv-min620:flex-row uv-min620:items-center uv-min620:justify-between uv-max619:items-start uv-max619:in-word-meta:gap-1.25 uv-max619:in-badge-nth-child-n-3:hidden">
            <div className="word-meta flex flex-wrap gap-1.75 items-center">
              <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                {partOfSpeechKeys[word.partOfSpeech]
                  ? t(partOfSpeechKeys[word.partOfSpeech])
                  : word.partOfSpeech.toLowerCase()}
              </span>
              <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">
                {stateKeys[state.state]
                  ? t(stateKeys[state.state])
                  : state.state.toLowerCase()}
              </span>
              <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{course.targetLevel}</span>
            </div>
            <WordLanguageSwitch />
          </div>

          <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
            {formatLexemeLabel(word)}
          </h1>

          {word.plural ? (
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">
              {t("word.plural", { value: word.plural })}
            </p>
          ) : null}

          <div className="word-hero-meanings mt-1 pt-4.5 border-1px-solid-border-3">
            <div className="word-hero-meaning-list flex flex-wrap gap-16px-32px">
              <WordMeaning
                translations={word.translations}
                definitions={word.definitions}
              />
            </div>
          </div>
        </section>

        <nav className="word-detail-actions flex flex-wrap gap-2 in-button:flex-1-1-165px in-button:min-height-tap-target in-word-quick-action-button:flex-1-1-165px in-word-quick-action-button:min-height-tap-target" aria-label={t("word.actions")}>
          <TeachWordSheet lexemeId={word.id} label={formatLexemeLabel(word)} />
          <Link
            href={"/practice?lexeme=" + word.id}
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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
