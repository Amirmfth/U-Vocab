import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isTranslationVisible } from "@/lib/translations";
import { currentRetrievability } from "@/lib/fsrs";
import { TranslationModeControl } from "@/components/translation-mode-control";
import { VocabularyFilters } from "./VocabularyFilters";

export const dynamic = "force-dynamic";

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

  const [items, packs] = await Promise.all([
    db.userVocabulary.findMany({
      where: { userId: user.id },
      include: {
        lexeme: {
          include: {
            translations: true,
            patterns: true,
            insights: { select: { level: true } },
            outgoing: { select: { type: true, target: { select: { lemma: true } } } },
            incoming: { select: { type: true, source: { select: { lemma: true } } } },
            topicPackItems: { select: { topicPackId: true } },
            encounters: {
              where: { userId: user.id },
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
      take: 500,
    }),
    db.topicPack.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

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
      !word.topicPackItems.some((topic) => topic.topicPackId === current.topic)
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
          relationTypes.has(type as never),
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
      <section className="page-header compact library-header">
        <div>
          <h1>Vocabulary</h1>
          <p className="muted">
            {filtered.length} shown · {items.length} total
          </p>
        </div>
        <div className="library-header-actions">
          <TranslationModeControl value={user.preferredTranslation} />
          <Link href="/vocabulary/new" className="button button-primary">
            <Plus size={18} />
            Add word
          </Link>
        </div>
      </section>

      <VocabularyFilters
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={LEVELS.map((level) => ({ value: level, label: level }))}
        topicOptions={packs.map((pack) => ({
          value: pack.id,
          label: pack.title,
        }))}
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

            return (
              <Link
                className="vocabulary-row"
                key={item.id}
                href={"/vocabulary/" + word.id}
              >
                <div className="vocabulary-row-main">
                  <div className="word">
                    {word.article ? word.article + " " : ""}
                    {word.lemma}
                  </div>
                  <div className="translation-line">
                    {translations.map((translation) => (
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
                  <span>{word.partOfSpeech}</span>
                  <span>{item.state.toLowerCase()}</span>
                  <span>{mastery}%</span>
                </div>
                <div className="mastery-line" aria-hidden="true">
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
