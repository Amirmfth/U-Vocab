import Link from "next/link";
import type { RelationType } from "@prisma/client";
import { BookOpen, GitCompareArrows, Layers3, Network, Plus, ScanText, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { currentRetrievability } from "@/lib/fsrs";
import { TranslationModeControl } from "@/components/translation-mode-control";
import { VocabularyFilters } from "./VocabularyFilters";
import { VocabularyScrollRestoration } from "./VocabularyScrollRestoration";
import { connection } from "next/server";
import { getCachedVocabularyLibrary } from "@/lib/cached-data";
import { formatLexemeLabel } from "@/lib/lexeme-display";


const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default async function Vocabulary({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    pos?: string;
    level?: string;
    topic?: string;
    relation?: string;
  }>;
}) {
  await connection();
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);

  const current = {
    q: (query.q ?? "").trim(),
    status: query.status ?? "ALL",
    pos: query.pos ?? "ALL",
    level: query.level ?? "ALL",
    topic: query.topic ?? "ALL",
    relation: query.relation ?? "ALL",
  };

  const [items, packs] = await getCachedVocabularyLibrary(user.id);

  const normalizedQuery = current.q.toLocaleLowerCase("de-DE");

  const filtered = items.filter((item) => {
    const word = item.lexeme;
    const mastery =
      (item.recognition +
        item.meaningRecall +
        item.production +
        item.contextualUsage) /
      4;

    if (normalizedQuery) {
      const searchable = [
        word.lemma,
        ...word.translations
          .filter((translation) =>
            isTranslationVisible(user.preferredTranslation, translation.language),
          )
          .map((translation) => translation.text),
        ...word.outgoing.map((relation) => relation.target.lemma),
        ...word.incoming.map((relation) => relation.source.lemma),
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE");

      if (!searchable.includes(normalizedQuery)) return false;
    }

    if (current.pos !== "ALL" && word.partOfSpeech !== current.pos) return false;

    if (
      current.level !== "ALL" &&
      !word.insights.some((insight) => insight.level === current.level)
    ) {
      return false;
    }

    if (
      current.topic !== "ALL" &&
      !word.topicPackItems.some((item) => item.topicPack.topic === current.topic)
    ) {
      return false;
    }

    if (current.relation !== "ALL") {
      const relationTypes = new Set([
        ...word.outgoing.map((relation) => relation.type),
        ...word.incoming.map((relation) => relation.type),
      ]);

      if (
        current.relation === "WORD_FAMILY" &&
        !relationTypes.has("WORD_FAMILY") &&
        !relationTypes.has("DERIVED")
      ) {
        return false;
      }

      if (
        current.relation === "COLLOCATION" &&
        !relationTypes.has("COLLOCATION")
      ) {
        return false;
      }

      if (
        current.relation === "RELATED" &&
        !["RELATED", "SYNONYM", "ANTONYM", "PHRASE"].some((type) =>
          relationTypes.has(type as RelationType),
        )
      ) {
        return false;
      }
    }

    switch (current.status) {
      case "NEW":
        return item.state === "NEW";
      case "LEARNING":
        return ["LEARNING", "FAMILIAR", "ACTIVE"].includes(item.state);
      case "WEAK":
        return mastery < 0.45;
      case "STRONG":
        return mastery >= 0.75 && !["MASTERED", "MAINTENANCE"].includes(item.state);
      case "MASTERED":
        return ["MASTERED", "MAINTENANCE"].includes(item.state);
      case "DUE":
        return !item.nextReviewAt || item.nextReviewAt <= now;
      case "RECENT":
        return Boolean(
          word.encounters[0] && word.encounters[0].createdAt >= recentCutoff,
        );
      case "DIFFICULT": {
        const retrievability = item.fsrsCard
          ? currentRetrievability(item.fsrsCard)
          : 1;
        return (item.difficulty ?? 0) >= 7 || retrievability < 0.7;
      }
      default:
        return true;
    }
  });

  const partOfSpeechOptions = Array.from(
    new Set(items.map((item) => item.lexeme.partOfSpeech)),
  )
    .sort()
    .map((value) => ({
      value,
      label: value.replaceAll("_", " ").toLowerCase(),
    }));

  return (
    <main className="page">
      <VocabularyScrollRestoration />
      <section className="page-header compact library-header">
        <div>
          <h1>Vocabulary</h1>
          <p className="muted">
            {filtered.length} shown · {items.length} total
          </p>
        </div>
        <div className="library-header-actions">
          <TranslationModeControl value={user.preferredTranslation} />
          <div className="library-primary-actions">
            <Link href="/vocabulary/new" className="button button-primary" prefetch>
              <Plus size={18} />
              Add word
            </Link>
            <Link href="/read" className="button button-secondary">
              <ScanText size={17} />
              Scan
            </Link>
          </div>
        </div>
      </section>

      <details className="words-explore">
        <summary>
          <span>
            <strong>Explore & tools</strong>
            <small>Packs, recommendations, compare, and universe</small>
          </span>
          <Layers3 size={18} />
        </summary>
        <div className="ia-tool-strip" aria-label="Words tools">
          <Link href="/topic-packs" className="ia-tool-link">
            <Layers3 size={17} /><span><strong>Packs</strong><small>Topic collections</small></span>
          </Link>
          <Link href="/recommendations" className="ia-tool-link">
            <Star size={17} /><span><strong>Recommendations</strong><small>What to learn next</small></span>
          </Link>
          <Link href="/compare" className="ia-tool-link">
            <GitCompareArrows size={17} /><span><strong>Compare</strong><small>Distinguish similar words</small></span>
          </Link>
          <Link href="/universe" className="ia-tool-link">
            <Network size={17} /><span><strong>Universe</strong><small>Explore your lexical graph</small></span>
          </Link>
        </div>
      </details>

      <nav className="ia-subnav" aria-label="Words views">
        <Link href="/vocabulary" className={current.status === "ALL" ? "is-active" : ""}>All</Link>
        <Link href="/vocabulary?status=WEAK" className={current.status === "WEAK" ? "is-active" : ""}>Weak</Link>
        <Link href="/vocabulary?status=NEW" className={current.status === "NEW" ? "is-active" : ""}>New</Link>
        <Link href="/vocabulary?status=MASTERED" className={current.status === "MASTERED" ? "is-active" : ""}>Mastered</Link>
        <Link href="/topic-packs"><Layers3 size={14} /> Packs</Link>
      </nav>

      <VocabularyFilters
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={LEVELS.map((level) => ({ value: level, label: level }))}
        topicOptions={Array.from(
          new Map(packs.map((pack) => [pack.topic, { value: pack.topic, label: pack.topic }])).values(),
        )}
      />

      {filtered.length ? (
        <div className="vocabulary-list">
          {filtered.map((item) => {
            const word = item.lexeme;
            const translations = word.translations.filter((translation) =>
              isTranslationVisible(
                user.preferredTranslation,
                translation.language,
              ),
            );
            const mastery = Math.round(
              ((item.recognition +
                item.meaningRecall +
                item.production +
                item.contextualUsage) /
                4) *
                100,
            );
            const isDue = !item.nextReviewAt || item.nextReviewAt <= now;
            const isWeak = mastery < 45;

            return (
              <Link
                className="vocabulary-row"
                key={item.id}
                href={"/vocabulary/" + word.id}
                prefetch
              >
                <div className="vocabulary-row-main">
                  <div className="word">
                    {formatLexemeLabel(word)}
                  </div>
                  <div className="translation-line">
                    {translations.slice(0, 1).map((translation) => (
                      <span
                        key={translation.id}
                        className={
                          translation.language === "fa" ? "rtl" : undefined
                        }
                      >
                        {translation.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="vocabulary-row-meta">
                  <span>{item.state.toLowerCase()}</span>
                  {isDue ? <span className="row-signal">due</span> : null}
                  {isWeak ? <span className="row-signal">weak</span> : null}
                  <strong>{mastery}%</strong>
                </div>
                <div className="mastery-line" aria-label={"Mastery " + mastery + "%"}>
                  <span style={{ width: mastery + "%" }} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <BookOpen size={22} />
          <strong>No vocabulary matches these filters.</strong>
          <Link href="/vocabulary" className="button button-secondary">
            Clear filters
          </Link>
        </div>
      )}
    </main>
  );
}
