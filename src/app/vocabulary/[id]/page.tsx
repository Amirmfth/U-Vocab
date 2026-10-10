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
    <details className="panel word-detail-card word-detail-disclosure uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c uv-vd552c26874:mb-2.5 p-0 uv-v1888c0d32c:min-h-14.5 uv-v1888c0d32c:flex uv-v1888c0d32c:items-center uv-v1888c0d32c:justify-between uv-v1888c0d32c:gap-3 uv-v1888c0d32c:uv-padding-b0f44c163d uv-v1888c0d32c:list-none uv-v0f504617cb:hidden uv-v0c41f2189d:flex uv-v0c41f2189d:flex-col uv-v0c41f2189d:gap-0.75 uv-vae06c40c05:text-uv-text uv-vae06c40c05:text-uv-fee84419642" open>
      <summary>
        <span>
          <strong>{t("word.grammarUsage")}</strong>
        </span>
        <span className="disclosure-hint text-uv-text-muted text-uv-ff7862da171">
          {t("word.savedCount", { count: formatNumber(locale, patterns.length) })}
        </span>
      </summary>
      <div className="word-disclosure-content uv-padding-930b670eb3">
        {patterns.length ? (
          patterns.map((pattern) => (
            <div className="pattern-block uv-v446e383d19:pt-3 uv-v446e383d19:uv-border-top-8d7f82f403" key={pattern.id}>
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
    <section className="panel word-detail-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c p-3.75 uv-vd552c26874:mb-2.5">
      <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.grammarEyebrow")}</p>
          <h2>{t("word.structures")}</h2>
        </div>
        <Brain size={19} />
      </div>
      <div className="grammar-link-list flex flex-col uv-border-top-8d7f82f403">
        {links.map((link) => (
          <Link
            href={"/grammar/" + link.grammarConcept.slug}
            className="grammar-link-row min-h-15.5 grid uv-grid-template-columns-6d7d156f80 items-center gap-2.5 uv-padding-10ff753f5f uv-v2289990f95:uv-border-top-8d7f82f403 uv-v386ffa8f69:min-w-0 uv-v386ffa8f69:flex uv-v386ffa8f69:flex-col uv-v386ffa8f69:gap-0.75 uv-veda02a0adb:text-uv-fa2582d5d6e uv-v982220ddd5:overflow-hidden uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171 uv-v982220ddd5:uv-text-overflow-900198081b uv-v982220ddd5:whitespace-nowrap uv-v872d6ea02a:text-uv-text-muted"
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
            <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{link.grammarConcept.introducedAt}</span>
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
    <section className="panel word-detail-card word-mastery-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c p-3.75 uv-vd552c26874:mb-2.5">
      <h2>{t("word.mastery")}</h2>
      <p className="muted text-uv-text-muted">
        {t("word.overallMastery", {
          percent: formatPercent(locale, overall),
        })}
      </p>
      {scores.map(([label, value]) => {
        const score = Math.round(Number(value) * 100);
        return (
          <div className="mastery-row flex flex-col gap-1.75 uv-v0fee2d502c:flex uv-v0fee2d502c:justify-between uv-v0fee2d502c:gap-3 uv-v0fee2d502c:text-uv-text-soft uv-v0fee2d502c:text-uv-f6c2d68ddb8 uv-veda02a0adb:uv-font-family-320794573f uv-veda02a0adb:text-uv-f823f1262bd" key={label}>
            <div>
              <span>{label}</span>
              <strong>{formatPercent(locale, Number(value))}</strong>
            </div>
            <div className="metric-bar h-1.75 overflow-hidden rounded-uv-red9ab892c5 bg-uv-surface-soft uv-v22810335d8:block uv-v22810335d8:h-full uv-v22810335d8:rounded-uv-r3e26d67509 uv-v22810335d8:bg-uv-primary">
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
        <div className="skeleton loading-section-heading rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b w-32.5 h-6.25" />
        <div className="loading-example-grid grid gap-3 uv-min700:uv-grid-template-columns-dd0b1a1848">
          <div className="skeleton loading-example-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-37.5 rounded-uv-rd65225386d" />
          <div className="skeleton loading-example-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-37.5 rounded-uv-rd65225386d" />
        </div>
      </section>
      <div className="skeleton loading-word-disclosure uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
      <div className="skeleton loading-word-disclosure uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-17.5 rounded-uv-rd65225386d" aria-hidden="true" />
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
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <h2>{t("word.examples")}</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        {word.examples.length ? (
          <div className="grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-grid-template-columns-563355decf">
            {word.examples.slice(0, 4).map((example) => (
              <article className="card example-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-transition-4a430603b7 uv-v3df68d552f:uv-transform-bcd93e0f45 uv-min940:uv-vca03853e70:uv-transform-1f1d96f064 uv-min940:uv-vca03853e70:border-uv-border-strong uv-min940:uv-vca03853e70:bg-uv-surface-raised flex flex-col gap-2.5 uv-v026f084606:m-0 uv-v026f084606:uv-line-height-05c248da4c uv-ve6b262f465:m-0 uv-ve6b262f465:uv-line-height-05c248da4c rounded-uv-r6d27d54c6c" key={example.id}>
                <div className="word-meta flex flex-wrap gap-1.75 items-center">
                  {example.level ? (
                    <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{example.level}</span>
                  ) : null}
                  {example.register ? (
                    <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{example.register}</span>
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
        <section className="panel intelligence-panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c uv-max619:uv-scroll-margin-top-5a56436f48">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <h2>{t("word.connections")}</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="relation-list flex flex-wrap gap-2">
            {personalizedRelations.relations.map((relation) => (
              <Link
                href={"/vocabulary/" + relation.target.id}
                className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:font-semibold uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171"
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

          <Link href="/vocabulary" className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5" prefetch>
            {t("word.browseVocabulary")}{" "}
            <ArrowRight className="rtl-mirror" size={16} />
          </Link>
        </section>
      ) : null}

      <details className="word-history-disclosure uv-v1888c0d32c:min-h-14.5 uv-v1888c0d32c:flex uv-v1888c0d32c:items-center uv-v1888c0d32c:justify-between uv-v1888c0d32c:gap-3 uv-v1888c0d32c:uv-padding-b0f44c163d uv-v1888c0d32c:list-none uv-v0f504617cb:hidden uv-v0c41f2189d:flex uv-v0c41f2189d:flex-col uv-v0c41f2189d:gap-0.75 uv-vae06c40c05:text-uv-text uv-vae06c40c05:text-uv-fee84419642 uv-vb8cdaac41c:text-uv-text-muted uv-vb8cdaac41c:text-uv-ff7862da171 p-0 overflow-hidden uv-border-8d7f82f403 rounded-uv-r4678bd4d8a bg-uv-surface uv-vd9a37f5cd0:uv-padding-1045a59cd5 uv-vbd9b9189fd:uv-box-shadow-71f8e7976e uv-max619:uv-scroll-margin-top-5a56436f48">
        <summary>
          <span>
            <strong>{t("word.historyTitle")}</strong>
            <small>{t("word.historyHelp")}</small>
          </span>
        </summary>
        <section className="word-history-grid grid uv-grid-template-columns-6a5c4d4d49 gap-3 uv-min620:uv-grid-template-columns-dd0b1a1848">
          <article className="panel word-detail-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c p-3.75 uv-vd552c26874:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.reviewHistory")}</p>
            <h2>{t("word.recentReviews")}</h2>
            {state?.reviews.length ? (
              <div className="history-list flex flex-col">
                {state.reviews.map((review) => (
                  <div className="history-row min-h-10.5 flex items-center justify-between gap-3 uv-padding-d57d0138fc uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-right uv-v0806813012:items-start uv-v0806813012:flex-col uv-v0806813012:gap-0.75" key={review.id}>
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

          <article className="panel word-detail-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c p-3.75 uv-vd552c26874:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.encounters")}</p>
            <h2>{t("word.whereMet")}</h2>
            {word.encounters.length ? (
              <div className="history-list flex flex-col">
                {word.encounters.map((encounter) => (
                  <div className="history-row min-h-10.5 flex items-center justify-between gap-3 uv-padding-d57d0138fc uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-right uv-v0806813012:items-start uv-v0806813012:flex-col uv-v0806813012:gap-0.75" key={encounter.id}>
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

          <article className="panel word-detail-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 flex flex-col gap-3.5 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:uv-letter-spacing-60c8585fce rounded-uv-r6d27d54c6c p-3.75 uv-vd552c26874:mb-2.5">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.mistakeMemory")}</p>
            <h2>{t("word.recurringWeaknesses")}</h2>
            {word.mistakes.length ? (
              <div className="history-list flex flex-col">
                {word.mistakes.map((mistake) => (
                  <div className="history-row stacked min-h-10.5 flex items-center justify-between gap-3 uv-padding-d57d0138fc uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:capitalize uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-right uv-v0806813012:items-start uv-v0806813012:flex-col uv-v0806813012:gap-0.75" key={mistake.id}>
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
    <main className="page word-detail-page flex flex-col uv-min620:gap-5.5 uv-min940:gap-6 w-full gap-4.5 uv-vecc81eeaa9:grid uv-vecc81eeaa9:uv-grid-template-columns-f06dd92ea5 uv-vecc81eeaa9:items-start uv-vecc81eeaa9:gap-3 uv-v36e6efe6f1:min-w-0 uv-v2182f6b997:mt-0.5 uv-vbaebb52c57:gap-1.75 uv-v6a8829b0e2:uv-min-height-e45618b383 uv-vea5dd54ed5:gap-2.5 uv-vbd9b9189fd:border-uv-border uv-vbd9b9189fd:bg-uv-surface uv-v16674328d6:mb-0.5 uv-vfe12d2c38d:text-uv-f1fba8b9d92 uv-vf3a163301c:gap-1.5 uv-v28ff1278c5:border-uv-border uv-v3c8ad4524c:min-h-37.5 uv-vb8b10c2955:text-uv-f19feeb881c uv-vb8b10c2955:uv-line-height-4693695d02 uv-vc492dfe385:uv-transition-c961432cc4 uv-min620:uv-v2182f6b997:items-start uv-min940:uv-vea5dd54ed5:uv-grid-template-columns-90de32206c uv-min940:uv-vea5dd54ed5:items-start uv-min940:uv-v42a05fcb53:uv-grid-column-93b665dfb5 uv-min940:uv-v5d6f86d820:border-uv-border-strong uv-min940:uv-v5d6f86d820:bg-uv-surface-soft uv-min940:uv-v5d6f86d820:uv-transform-4693dc4baa">
      <WordLanguageProvider
        preference={course.explanationLanguage}
        targetLanguageCode={targetLanguageCode}
      >
        <WordPageScrollReset wordId={word.id} />
        <section className="page-header word-identity-hero flex flex-col uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 pt-4 relative gap-3.5 overflow-hidden p-5 uv-border-8d7f82f403 rounded-uv-r02a0a889dd uv-background-eca1ffad00 uv-v3bccf64584:max-w-uv-0927635a28 uv-v3bccf64584:text-uv-fd2f79ab33d uv-v3bccf64584:uv-line-height-cf2391bf16 uv-v3bccf64584:uv-letter-spacing-5248f40d63 uv-v3bccf64584:uv-overflow-wrap-112c2a063a uv-vca7070d208:text-uv-text-muted uv-vca7070d208:text-uv-fa2582d5d6e uv-min620:p-6.5 uv-min940:p-7.5">
          <div className="word-detail-topline flex flex-col gap-2.5 uv-min620:flex-row uv-min620:items-center uv-min620:justify-between uv-max619:items-start uv-max619:uv-va82387843d:gap-1.25 uv-max619:uv-vcd0ef283b1:hidden">
            <div className="word-meta flex flex-wrap gap-1.75 items-center">
              <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
                {partOfSpeechKeys[word.partOfSpeech]
                  ? t(partOfSpeechKeys[word.partOfSpeech])
                  : word.partOfSpeech.toLowerCase()}
              </span>
              <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">
                {stateKeys[state.state]
                  ? t(stateKeys[state.state])
                  : state.state.toLowerCase()}
              </span>
              <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{course.targetLevel}</span>
            </div>
            <WordLanguageSwitch />
          </div>

          <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
            {formatLexemeLabel(word)}
          </h1>

          {word.plural ? (
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">
              {t("word.plural", { value: word.plural })}
            </p>
          ) : null}

          <div className="word-hero-meanings mt-1 pt-4.5 uv-border-top-8d7f82f403">
            <div className="word-hero-meaning-list flex flex-wrap uv-gap-9f335bd1e4">
              <WordMeaning
                translations={word.translations}
                definitions={word.definitions}
              />
            </div>
          </div>
        </section>

        <nav className="word-detail-actions flex flex-wrap gap-2 uv-ve7e0cd887c:uv-flex-a5d8dbfcd5 uv-ve7e0cd887c:uv-min-height-e45618b383 uv-v922f66b8af:uv-flex-a5d8dbfcd5 uv-v922f66b8af:uv-min-height-e45618b383" aria-label={t("word.actions")}>
          <TeachWordSheet lexemeId={word.id} label={formatLexemeLabel(word)} />
          <Link
            href={"/practice?lexeme=" + word.id}
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
