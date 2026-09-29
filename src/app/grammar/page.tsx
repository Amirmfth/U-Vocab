import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CircleAlert,
  GraduationCap,
  Target,
} from "lucide-react";
import type { CefrLevel, GrammarCategory } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { getGrammarDashboard } from "@/lib/grammar/dashboard";
import { grammarStatusLabel } from "@/lib/grammar/learner-policy";
import { CEFR_LEVELS } from "@/lib/grammar/levels";

const CATEGORY_LABELS: Record<GrammarCategory, string> = {
  SENTENCE_STRUCTURE: "Sentence structure",
  CASES: "Cases",
  VERBS: "Verbs",
  TENSES: "Tenses",
  ARTICLES: "Articles",
  ADJECTIVES: "Adjectives",
  PREPOSITIONS: "Prepositions",
  PRONOUNS: "Pronouns",
  CONJUNCTIONS: "Conjunctions",
  RELATIVE_CLAUSES: "Relative clauses",
  NEGATION: "Negation",
  COMPARISON: "Comparison",
  PASSIVE: "Passive",
  SUBJUNCTIVE: "Subjunctive",
  INFINITIVE_CONSTRUCTIONS: "Infinitive constructions",
  NOUNS: "Nouns",
  ADVERBS_PARTICLES: "Adverbs & particles",
  WORD_FORMATION: "Word formation",
};

function ConceptRow({
  item,
}: {
  item: Awaited<ReturnType<typeof getGrammarDashboard>>["items"][number];
}) {
  return (
    <Link href={"/grammar/" + item.slug} className="grammar-concept-row">
      <div className="grammar-concept-main">
        <div className="word-meta">
          <span className={"grammar-state grammar-state-" + item.status.toLowerCase()}>
            {grammarStatusLabel(item.status)}
          </span>
          <span className="badge">{item.introducedAt}</span>
        </div>
        <strong>{item.title}</strong>
        <small>{item.shortDescription}</small>
      </div>
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}

export default async function GrammarPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; category?: string }>;
}) {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const dashboard = await getGrammarDashboard(user.id, course.id);
  const language = targetLanguageConfig(course.targetLanguage);
  const params = await searchParams;

  const selectedLevel = CEFR_LEVELS.includes(params.level as CefrLevel)
    ? (params.level as CefrLevel)
    : null;
  const selectedCategory = dashboard.categories.includes(
    params.category as GrammarCategory,
  )
    ? (params.category as GrammarCategory)
    : null;

  const filtered = dashboard.items.filter(
    (item) =>
      (!selectedLevel || item.introducedAt === selectedLevel) &&
      (!selectedCategory || item.category === selectedCategory),
  );

  return (
    <main className="page grammar-hub">
      <section className="grammar-hero">
        <div>
          <p className="eyebrow">GRAMMAR</p>
          <h1>Your {language.label} structure</h1>
          <p className="page-description">
            A curated curriculum that starts from what you already know and
            gets more accurate as U-Vocab sees real evidence.
          </p>
        </div>
        <div className="grammar-level-path" aria-label={"Current and target " + language.label + " levels"}>
          <span>
            <small>Current</small>
            <strong>{dashboard.currentLevel}</strong>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
          <span>
            <small>Target</small>
            <strong>{dashboard.targetLevel}</strong>
          </span>
        </div>
      </section>

      <section className="grammar-summary" aria-label="Grammar profile summary">
        <div><strong>{dashboard.counts.NEEDS_ATTENTION}</strong><span>needs attention</span></div>
        <div><strong>{dashboard.counts.LEARNING}</strong><span>learning</span></div>
        <div><strong>{dashboard.counts.STRONG}</strong><span>strong</span></div>
        <div><strong>{dashboard.counts.ASSUMED}</strong><span>assumed</span></div>
      </section>

      {!dashboard.items.length ? (
        <div className="empty-state compact-empty">
          <strong>Grammar curriculum is not loaded yet.</strong>
          <span className="muted">Run the canonical grammar seed after applying database migrations.</span>
        </div>
      ) : null}

      {dashboard.needsAttention.length ? (
        <section className="page-section grammar-priority-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEEDS ATTENTION</p>
              <h2>Recent evidence says revisit these</h2>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.needsAttention.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.learning.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONTINUE</p>
              <h2>Keep building</h2>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.learning.slice(0, 4).map((item) => (
              <ConceptRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {dashboard.recommended.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RECOMMENDED NEXT</p>
              <h2>Ready from your current path</h2>
            </div>
            <Target size={20} />
          </div>
          <div className="grammar-list">
            {dashboard.recommended.map((item) => (
              <ConceptRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section grammar-curriculum">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURRICULUM</p>
            <h2>Browse the full map</h2>
          </div>
          <GraduationCap size={20} />
        </div>

        <div className="grammar-filter-strip" aria-label="Filter grammar by level">
          <Link href="/grammar" className={!selectedLevel && !selectedCategory ? "is-active" : ""}>All</Link>
          {CEFR_LEVELS.map((level) => (
            <Link
              key={level}
              href={"/grammar?level=" + level}
              className={selectedLevel === level ? "is-active" : ""}
            >
              {level}
            </Link>
          ))}
        </div>

        <div className="grammar-category-strip" aria-label="Filter grammar by category">
          {dashboard.categories.map((category) => (
            <Link
              key={category}
              href={"/grammar?category=" + category}
              className={selectedCategory === category ? "is-active" : ""}
            >
              {CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>

        <div className="grammar-list">
          {(selectedLevel || selectedCategory ? filtered : dashboard.sortedItems).map((item) => (
            <ConceptRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
