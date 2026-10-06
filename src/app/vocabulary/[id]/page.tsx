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
  currentLevel,
  targetLevel,
}: {
  patterns: PrimaryWord["patterns"];
  locale: UiLocale;
  targetLanguageCode: string;
  currentLevel: string;
  targetLevel: string;
}) {
  const t = createTranslator(locale);
  return (
    <details className="panel word-detail-card word-detail-disclosure" open>
      <summary>
        <span>
          <strong>{t("word.grammarUsage")}</strong>
        </span>
        <span className="disclosure-hint">
          {t("word.savedCount", { count: formatNumber(locale, patterns.length) })}
        </span>
      </summary>
      <div className="word-disclosure-content">
        {patterns.length ? (
          patterns.map((pattern) => (
            <div className="pattern-block" key={pattern.id}>
              <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                {pattern.pattern}
              </strong>
              {pattern.explanation ? (
                <p className="muted learning-content" dir="auto">
                  {pattern.explanation}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted">{t("word.noPatterns")}</p>
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
    <section className="panel word-detail-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("word.grammarEyebrow")}</p>
          <h2>{t("word.structures")}</h2>
        </div>
        <Brain size={19} />
      </div>
      <div className="grammar-link-list">
        {links.map((link) => (
          <Link
            href={"/grammar/" + link.grammarConcept.slug}
            className="grammar-link-row"
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
            <span className="badge">{link.grammarConcept.introducedAt}</span>
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
    <section className="panel word-detail-card word-mastery-section">
      <h2>{t("word.mastery")}</h2>
      <p className="muted">
        {t("word.overallMastery", {
          percent: formatPercent(locale, overall),
        })}
      </p>
      {scores.map(([label, value]) => {
        const score = Math.round(Number(value) * 100);
        return (
          <div className="mastery-row" key={label}>
            <div>
              <span>{label}</span>
              <strong>{formatPercent(locale, Number(value))}</strong>
            </div>
            <div className="metric-bar">
              <span style={{ width: score + "%" }} />
            </div>
          </div>
        );
      })}
      {state.nextReviewAt ? (
        <p
          className="muted"
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
        className="page-section"
        aria-busy="true"
        aria-label={t("word.loadingDetails")}
      >
        <div className="skeleton loading-section-heading" />
        <div className="loading-example-grid">
          <div className="skeleton loading-example-card" />
          <div className="skeleton loading-example-card" />
        </div>
      </section>
      <div className="skeleton loading-word-disclosure" aria-hidden="true" />
      <div className="skeleton loading-word-disclosure" aria-hidden="true" />
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
}: {
  userId: string;
  userCourseId: string;
  lexemeId: string;
  level: string;
  patterns: PrimaryWord["patterns"];
  primaryState: PrimaryWord["userStates"][number];
  locale: UiLocale;
  targetLanguageCode: string;
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
      <section className="page-section">
        <div className="section-heading">
          <div>
            <h2>{t("word.examples")}</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        {word.examples.length ? (
          <div className="grid">
            {word.examples.slice(0, 4).map((example) => (
              <article className="card example-card" key={example.id}>
                <div className="word-meta">
                  {example.level ? (
                    <span className="badge">{example.level}</span>
                  ) : null}
                  {example.register ? (
                    <span className="badge">{example.register}</span>
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
          <p className="muted">{t("word.noExamples")}</p>
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
        <section className="panel intelligence-panel">
          <div className="section-heading">
            <div>
              <h2>{t("word.connections")}</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="relation-list">
            {personalizedRelations.relations.map((relation) => (
              <Link
                href={"/vocabulary/" + relation.target.id}
                className="relation-chip"
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

          <Link href="/vocabulary" className="text-link" prefetch>
            {t("word.browseVocabulary")}{" "}
            <ArrowRight className="rtl-mirror" size={16} />
          </Link>
        </section>
      ) : null}

      <details className="word-history-disclosure">
        <summary>
          <span>
            <strong>{t("word.historyTitle")}</strong>
            <small>{t("word.historyHelp")}</small>
          </span>
        </summary>
        <section className="word-history-grid">
          <article className="panel word-detail-card">
            <p className="eyebrow">{t("word.reviewHistory")}</p>
            <h2>{t("word.recentReviews")}</h2>
            {state?.reviews.length ? (
              <div className="history-list">
                {state.reviews.map((review) => (
                  <div className="history-row" key={review.id}>
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
              <p className="muted">{t("word.noReviews")}</p>
            )}
          </article>

          <article className="panel word-detail-card">
            <p className="eyebrow">{t("word.encounters")}</p>
            <h2>{t("word.whereMet")}</h2>
            {word.encounters.length ? (
              <div className="history-list">
                {word.encounters.map((encounter) => (
                  <div className="history-row" key={encounter.id}>
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
              <p className="muted">{t("word.noEncounters")}</p>
            )}
          </article>

          <article className="panel word-detail-card">
            <p className="eyebrow">{t("word.mistakeMemory")}</p>
            <h2>{t("word.recurringWeaknesses")}</h2>
            {word.mistakes.length ? (
              <div className="history-list">
                {word.mistakes.map((mistake) => (
                  <div className="history-row stacked" key={mistake.id}>
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
              <p className="muted">{t("word.noMistakes")}</p>
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
    <main className="page word-detail-page">
      <WordLanguageProvider
        preference={course.explanationLanguage}
        targetLanguageCode={targetLanguageCode}
      >
        <WordPageScrollReset wordId={word.id} />
        <section className="page-header word-identity-hero">
          <div className="word-detail-topline">
            <div className="word-meta">
              <span className="badge">
                {partOfSpeechKeys[word.partOfSpeech]
                  ? t(partOfSpeechKeys[word.partOfSpeech])
                  : word.partOfSpeech.toLowerCase()}
              </span>
              <span className="badge">
                {stateKeys[state.state]
                  ? t(stateKeys[state.state])
                  : state.state.toLowerCase()}
              </span>
              <span className="badge">{course.targetLevel}</span>
            </div>
            <WordLanguageSwitch />
          </div>

          <h1 className="learning-content" lang={targetLanguageCode} dir="ltr">
            {formatLexemeLabel(word)}
          </h1>

          {word.plural ? (
            <p className="page-description">
              {t("word.plural", { value: word.plural })}
            </p>
          ) : null}

          <div className="word-hero-meanings">
            <div className="word-hero-meaning-list">
              <WordMeaning
                translations={word.translations}
                definitions={word.definitions}
              />
            </div>
          </div>
        </section>

        <nav className="word-detail-actions" aria-label={t("word.actions")}>
          <TeachWordSheet lexemeId={word.id} label={formatLexemeLabel(word)} />
          <Link
            href={"/practice?lexeme=" + word.id}
            className="button button-secondary"
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
