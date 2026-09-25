import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Network,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { startOperation } from "@/lib/performance";
import {
  getCachedWordPrimary,
  getCachedWordSecondary,
} from "@/lib/cached-data";
import { isTranslationVisible, translationLabel } from "@/lib/translations";
import { LexicalInsightPanel } from "./LexicalInsightPanel";
import { TranslationModeControl } from "@/components/translation-mode-control";
import { ExpansionPanel } from "./ExpansionPanel";
import { VerbConjugation } from "./VerbConjugation";

function SecondaryWordSkeleton() {
  return (
    <>
      <section className="panel intelligence-panel" aria-busy="true">
        <div className="skeleton-stack">
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-copy" />
        </div>
      </section>
      <section className="word-history-grid" aria-busy="true">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </section>
    </>
  );
}

async function DeferredWordDetails({
  userId,
  lexemeId,
  level,
  preferredTranslation,
}: {
  userId: string;
  lexemeId: string;
  level: string;
  preferredTranslation: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const word = await getCachedWordSecondary(userId, lexemeId, level);
  if (!word) return null;

  const state = word.userStates[0];
  const insight = word.insights[0];

  return (
    <>
      <section className="panel intelligence-panel" id="compare">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OPENAI · GENERATED CONTENT</p>
            <h2>Contextual explanation</h2>
          </div>
          <Sparkles size={20} />
        </div>

        {insight ? (
          <div className="insight-content">
            <div>
              <h3>German definition</h3>
              <p>{insight.germanDefinition}</p>
            </div>

            {preferredTranslation !== "PERSIAN" ? (
              <div>
                <h3>English explanation</h3>
                <p className="muted">{insight.englishExplanation}</p>
              </div>
            ) : null}

            {preferredTranslation !== "ENGLISH" ? (
              <div className="rtl">
                <h3>توضیح فارسی</h3>
                <p className="muted">{insight.persianExplanation}</p>
              </div>
            ) : null}

            <div>
              <h3>Grammar notes</h3>
              <p>{insight.grammarNotes}</p>
            </div>

            {insight.comparisonTarget && insight.comparisonNotes ? (
              <div className="comparison-box">
                <p className="eyebrow">COMPARE</p>
                <h3>
                  {word.lemma} vs. {insight.comparisonTarget}
                </h3>
                <p>{insight.comparisonNotes}</p>
              </div>
            ) : null}

            <p className="generated-meta">
              AI-generated · {insight.level} · version {insight.version}
            </p>
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <Sparkles size={22} />
            <strong>No contextual explanation generated yet.</strong>
            <span>Generate one at your current {level} target level.</span>
          </div>
        )}

        <LexicalInsightPanel
          lexemeId={word.id}
          hasInsight={Boolean(insight)}
        />
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONTEXT</p>
            <h2>Examples</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        <div className="grid">
          {word.examples.map((example) => (
            <article className="card example-card" key={example.id}>
              <div className="word-meta">
                {example.level ? (
                  <span className="badge">{example.level}</span>
                ) : null}
                {example.register ? (
                  <span className="badge">{example.register}</span>
                ) : null}
                <span className="badge">
                  {example.generatedByAi ? "AI generated" : "canonical"}
                </span>
              </div>
              <strong>{example.german}</strong>
              {preferredTranslation !== "PERSIAN" && example.english ? (
                <p className="muted">{example.english}</p>
              ) : null}
              {preferredTranslation !== "ENGLISH" && example.persian ? (
                <p className="rtl muted">{example.persian}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {word.outgoing.length ? (
        <section className="panel intelligence-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEXICAL GRAPH</p>
              <h2>Connections</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="relation-list">
            {word.outgoing.map((relation) => (
              <Link
                href={"/vocabulary/" + relation.target.id}
                className="relation-chip"
                key={relation.id}
                prefetch
              >
                <span>{relation.target.lemma}</span>
                <small>{relation.type.replaceAll("_", " ")}</small>
              </Link>
            ))}
          </div>

          <Link href="/vocabulary" className="text-link" prefetch>
            Browse vocabulary <ArrowRight size={16} />
          </Link>
        </section>
      ) : null}

      <details className="word-history-disclosure">
        <summary>
          <span>
            <strong>Learning history & collections</strong>
            <small>Reviews, encounters, mistakes, and saved packs</small>
          </span>
        </summary>
        <section className="word-history-grid">
        <article className="panel word-detail-card">
          <p className="eyebrow">REVIEW HISTORY</p>
          <h2>Recent reviews</h2>
          {state?.reviews.length ? (
            <div className="history-list">
              {state.reviews.map((review) => (
                <div className="history-row" key={review.id}>
                  <span>{review.rating.toLowerCase()}</span>
                  <small>{review.reviewedAt.toLocaleString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No reviews yet.</p>
          )}
        </article>

        <article className="panel word-detail-card">
          <p className="eyebrow">ENCOUNTERS</p>
          <h2>Where you met it</h2>
          {word.encounters.length ? (
            <div className="history-list">
              {word.encounters.map((encounter) => (
                <div className="history-row" key={encounter.id}>
                  <span>{encounter.source}</span>
                  <small>{encounter.createdAt.toLocaleString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No tracked encounters yet.</p>
          )}
        </article>

        <article className="panel word-detail-card">
          <p className="eyebrow">MISTAKE MEMORY</p>
          <h2>Recurring weaknesses</h2>
          {word.mistakes.length ? (
            <div className="history-list">
              {word.mistakes.map((mistake) => (
                <div className="history-row stacked" key={mistake.id}>
                  <span>
                    {mistake.type.replaceAll("_", " ").toLowerCase()} ·{" "}
                    {mistake.occurrences}×
                  </span>
                  <small>
                    {mistake.resolvedAt
                      ? "resolved"
                      : mistake.explanation ?? "open"}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No recorded mistakes.</p>
          )}
        </article>

        <article className="panel word-detail-card">
          <p className="eyebrow">COLLECTIONS</p>
          <h2>Saved context</h2>
          {word.topicPackItems.length ? (
            <div className="relation-list">
              {word.topicPackItems.map((item) => (
                <Link
                  href={"/topic-packs/" + item.topicPack.id}
                  className="relation-chip"
                  key={item.id}
                  prefetch
                >
                  <span>{item.topicPack.title}</span>
                  <small>{item.topicPack.level}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Not in a topic pack yet.</p>
          )}
        </article>

        </section>
      </details>

      <ExpansionPanel lexemeId={word.id} />
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
  const [{ id }, user] = await Promise.all([
    params,
    perf.span("auth", () => getCurrentUser()),
  ]);

  const word = await perf.span("dbRead", () =>
    getCachedWordPrimary(user.id, id),
  );

  if (!word || word.userStates.length === 0) {
    perf.success({ found: false });
    notFound();
  }

  const state = word.userStates[0];
  const translations = word.translations.filter((translation) =>
    isTranslationVisible(
      user.preferredTranslation,
      translation.language,
    ),
  );

  perf.success({
    found: true,
    primaryPatternCount: word.patterns.length,
  });

  return (
    <main className="page">
      <section className="page-header">
        <div className="word-detail-topline">
          <div className="word-meta">
            <span className="badge">{word.partOfSpeech}</span>
            <span className="badge">{state.state}</span>
            <span className="badge">{user.targetLevel} explanations</span>
          </div>
          <TranslationModeControl value={user.preferredTranslation} />
        </div>

        <h1>{formatLexemeLabel(word)}</h1>

        {word.plural ? (
          <p className="page-description">Plural: {word.plural}</p>
        ) : null}

        <div className="word-primary-actions">
          <Link
            href={"/vocabulary/" + word.id + "/teach"}
            className="button button-primary"
            prefetch
          >
            <BookOpenCheck size={18} />
            Teach me this word
          </Link>
          <nav className="word-quick-actions" aria-label="Word actions">
            <Link href={"/practice?lexeme=" + word.id} prefetch>
              <Brain size={17} />
              Practice
            </Link>
            {word.partOfSpeech === "VERB" ? (
              <VerbConjugation lexemeId={word.id} />
            ) : null}
            <a href="#compare">Explain</a>
            <a href="#expand">Expand</a>
          </nav>
        </div>
      </section>

      <section className="word-detail-grid">
        <article className="panel word-detail-card">
          <p className="eyebrow">CANONICAL MEANING</p>
          <h2>Meaning</h2>
          {translations.map((translation) => (
            <div key={translation.id} className="meaning-block">
              <small className="muted">
                {translationLabel(translation.language)}
              </small>
              <p
                className={
                  translation.language === "fa"
                    ? "rtl lesson-meaning"
                    : "lesson-meaning"
                }
              >
                {translation.text}
              </p>
            </div>
          ))}
        </article>

        <article className="panel word-detail-card">
          <p className="eyebrow">LEARNER MODEL</p>
          <h2>Mastery</h2>

          {[
            ["Recognition", state.recognition],
            ["Meaning recall", state.meaningRecall],
            ["Production", state.production],
            ["Context", state.contextualUsage],
          ].map(([label, value]) => {
            const score = Number(value);
            return (
              <div className="mastery-row" key={String(label)}>
                <div>
                  <span>{label}</span>
                  <strong>{Math.round(score * 100)}%</strong>
                </div>
                <div className="metric-bar">
                  <span
                    style={{ width: Math.round(score * 100) + "%" }}
                  />
                </div>
              </div>
            );
          })}

          {state.nextReviewAt ? (
            <p className="muted">
              Next review: {state.nextReviewAt.toLocaleString()}
            </p>
          ) : null}
        </article>

        <details className="panel word-detail-card word-detail-disclosure">
          <summary>
            <span>
              <small className="eyebrow">LEXICAL PATTERNS</small>
              <strong>Grammar & usage</strong>
            </span>
            <span className="disclosure-hint">{word.patterns.length} saved</span>
          </summary>
          <div className="word-disclosure-content">
            {word.patterns.length ? (
              word.patterns.map((pattern) => (
                <div className="pattern-block" key={pattern.id}>
                  <strong>{pattern.pattern}</strong>
                  {pattern.explanation ? (
                    <p className="muted">{pattern.explanation}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="muted">No stored patterns yet.</p>
            )}
          </div>
        </details>
      </section>

      <Suspense fallback={<SecondaryWordSkeleton />}>
        <DeferredWordDetails
          userId={user.id}
          lexemeId={word.id}
          level={user.targetLevel}
          preferredTranslation={user.preferredTranslation}
        />
      </Suspense>
    </main>
  );
}
