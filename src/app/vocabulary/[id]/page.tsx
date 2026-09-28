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
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { formatRelativeReviewTime, toDate } from "@/lib/relative-time";
import { startOperation } from "@/lib/performance";
import {
  getCachedWordPrimary,
  getCachedWordSecondary,
} from "@/lib/cached-data";
import { WordExampleMeaning, WordLanguageProvider, WordLanguageSwitch, WordMeaning } from "./WordLanguage";
import { VerbConjugation } from "./VerbConjugation";
import { ExampleGenerationPanel } from "./ExampleGenerationPanel";
import { TeachWordSheet } from "./TeachWordSheet";
import { WordPageScrollReset } from "./WordPageScrollReset";

type PrimaryWord = NonNullable<Awaited<ReturnType<typeof getCachedWordPrimary>>>;

function GrammarAndUsage({ patterns }: { patterns: PrimaryWord["patterns"] }) {
  return (
    <details className="panel word-detail-card word-detail-disclosure" open>
      <summary>
        <span>
          <strong>Grammar & usage</strong>
        </span>
        <span className="disclosure-hint">{patterns.length} saved</span>
      </summary>
      <div className="word-disclosure-content">
        {patterns.length ? patterns.map((pattern) => (
          <div className="pattern-block" key={pattern.id}>
            <strong>{pattern.pattern}</strong>
            {pattern.explanation ? <p className="muted">{pattern.explanation}</p> : null}
          </div>
        )) : <p className="muted">No stored patterns yet.</p>}
      </div>
    </details>
  );
}

function LexicalGrammarLinks({
  links,
}: {
  links: NonNullable<Awaited<ReturnType<typeof getCachedWordSecondary>>>["grammarLinks"];
}) {
  if (!links.length) return null;

  return (
    <section className="panel word-detail-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">GRAMMAR</p>
          <h2>Structures this word reinforces</h2>
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
              <strong>{link.grammarConcept.title}</strong>
              <small>
                {link.lexicalPattern?.pattern ??
                  link.note ??
                  link.relationType.replaceAll("_", " ").toLowerCase()}
              </small>
            </span>
            <span className="badge">{link.grammarConcept.introducedAt}</span>
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function WordMastery({ state }: { state: PrimaryWord["userStates"][number] }) {
  const scores = [
    ["Recognition", state.recognition],
    ["Meaning recall", state.meaningRecall],
    ["Production", state.production],
    ["Context", state.contextualUsage],
  ] as const;
  const overall = Math.round(scores.reduce((sum, [, value]) => sum + Number(value), 0) / scores.length * 100);

  return (
    <section className="panel word-detail-card word-mastery-section">
      <h2>Mastery</h2>
      <p className="muted"><strong>{overall}%</strong> overall mastery</p>
      {scores.map(([label, value]) => {
        const score = Math.round(Number(value) * 100);
        return (
          <div className="mastery-row" key={label}>
            <div><span>{label}</span><strong>{score}%</strong></div>
            <div className="metric-bar"><span style={{ width: score + "%" }} /></div>
          </div>
        );
      })}
      {state.nextReviewAt ? (
        <p className="muted" title={toDate(state.nextReviewAt).toLocaleString()}>
          Next review: {formatRelativeReviewTime(state.nextReviewAt)}
        </p>
      ) : null}
    </section>
  );
}

function SecondaryWordSkeleton() {
  return (
    <>
      <section className="page-section" aria-busy="true" aria-label="Loading word details">
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
  lexemeId,
  level,
  patterns,
  primaryState,
}: {
  userId: string;
  lexemeId: string;
  level: string;
  patterns: PrimaryWord["patterns"];
  primaryState: PrimaryWord["userStates"][number];
}) {
  const word = await getCachedWordSecondary(userId, lexemeId, level);
  if (!word) return null;

  const state = word.userStates[0];

  return (
    <>
      <section className="page-section">
        <div className="section-heading">
          <div>
            <h2>Examples</h2>
          </div>
          <BookOpenCheck size={20} />
        </div>

        {word.examples.length ? (
          <div className="grid">
            {word.examples.slice(0, 4).map((example) => (
              <article className="card example-card" key={example.id}>
                <div className="word-meta">
                  {example.level ? <span className="badge">{example.level}</span> : null}
                  {example.register ? <span className="badge">{example.register}</span> : null}
                </div>
                <strong>{example.german}</strong>
                <WordExampleMeaning english={example.english} persian={example.persian} />
              </article>
            ))}
          </div>
        ) : <p className="muted">No examples yet.</p>}
        <ExampleGenerationPanel lexemeId={word.id} hasExamples={word.examples.length > 0} />
      </section>

      <GrammarAndUsage patterns={patterns} />
      <LexicalGrammarLinks links={word.grammarLinks} />

      <WordMastery state={primaryState} />

      {word.outgoing.length ? (
        <section className="panel intelligence-panel">
          <div className="section-heading">
            <div>
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
                  <small>{toDate(review.reviewedAt).toLocaleString()}</small>
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
                  <small>{toDate(encounter.createdAt).toLocaleString()}</small>
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
  perf.success({
    found: true,
    primaryPatternCount: word.patterns.length,
  });

  return (
    <main className="page word-detail-page">
      <WordLanguageProvider preference={user.preferredTranslation}>
      <WordPageScrollReset wordId={word.id} />
      <section className="page-header word-identity-hero">
        <div className="word-detail-topline">
          <div className="word-meta">
            <span className="badge">{word.partOfSpeech}</span>
            <span className="badge">{state.state}</span>
            <span className="badge">{user.targetLevel}</span>
          </div>
          <WordLanguageSwitch />
        </div>

        <h1>{formatLexemeLabel(word)}</h1>

        {word.plural ? (
          <p className="page-description">Plural: {word.plural}</p>
        ) : null}

        <div className="word-hero-meanings">
          <div className="word-hero-meaning-list">
            <WordMeaning translations={word.translations} />
          </div>
        </div>
      </section>

      <nav className="word-detail-actions" aria-label="Word actions">
          <TeachWordSheet
            lexemeId={word.id}
            label={formatLexemeLabel(word)}
          />
          <Link href={"/practice?lexeme=" + word.id} className="button button-secondary" prefetch>
            <Brain size={17} /> Practice
          </Link>
          {word.partOfSpeech === "VERB" ? <VerbConjugation lexemeId={word.id} /> : null}
      </nav>

      <Suspense fallback={<SecondaryWordSkeleton />}>
        <DeferredWordDetails
          userId={user.id}
          lexemeId={word.id}
          level={user.targetLevel}
          patterns={word.patterns}
          primaryState={state}
        />
      </Suspense>
      </WordLanguageProvider>
    </main>
  );
}
