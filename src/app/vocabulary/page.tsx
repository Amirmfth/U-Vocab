import type { RelationType } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { currentRetrievability } from "@/lib/fsrs";
import { VocabularyScrollRestoration } from "./VocabularyScrollRestoration";
import { connection } from "next/server";
import { getCachedVocabularyLibrary } from "@/lib/cached-data";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { VocabularyDisplay } from "./VocabularyDisplay";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function dateTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export default async function Vocabulary({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    pos?: string;
    level?: string;
    relation?: string;
    sort?: string;
  }>;
}) {
  await connection();
  const [user, course, query] = await Promise.all([getCurrentUser(), getCurrentCourse(), searchParams]);
  const language = targetLanguageConfig(course.targetLanguage);
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const nowTime = now.getTime();
  const recentCutoffTime = recentCutoff.getTime();

  const current = {
    q: (query.q ?? "").trim(),
    status: query.status ?? "ALL",
    pos: query.pos ?? "ALL",
    level: query.level ?? "ALL",
    relation: query.relation ?? "ALL",
    sort: query.sort ?? "RECENTLY_ADDED",
  };

  const items = await getCachedVocabularyLibrary(user.id, course.id);

  const normalizedQuery = current.q.toLocaleLowerCase(language.locale);

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
        ...word.translations.map((translation) => translation.text),
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
      word.cefrLevel !== current.level
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
        return !item.nextReviewAt || dateTime(item.nextReviewAt) <= nowTime;
      case "RECENT":
        return Boolean(
          word.encounters[0] && dateTime(word.encounters[0].createdAt) >= recentCutoffTime,
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

  const cefrRank = new Map(LEVELS.map((level, index) => [level, index]));
  const masteryOf = (item: (typeof items)[number]) =>
    (item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4;

  const sorted = [...filtered].sort((a, b) => {
    switch (current.sort) {
      case "ALPHABETICAL":
        return a.lexeme.lemma.localeCompare(b.lexeme.lemma, "de");
      case "CEFR_ASC":
        return (cefrRank.get(a.lexeme.cefrLevel ?? "") ?? 99) -
          (cefrRank.get(b.lexeme.cefrLevel ?? "") ?? 99);
      case "CEFR_DESC":
        return (cefrRank.get(b.lexeme.cefrLevel ?? "") ?? -1) -
          (cefrRank.get(a.lexeme.cefrLevel ?? "") ?? -1);
      case "MASTERY_ASC":
        return masteryOf(a) - masteryOf(b);
      case "MASTERY_DESC":
        return masteryOf(b) - masteryOf(a);
      case "NEXT_REVIEW":
        return (a.nextReviewAt ? dateTime(a.nextReviewAt) : 0) -
          (b.nextReviewAt ? dateTime(b.nextReviewAt) : 0);
      default:
        return dateTime(b.addedAt) - dateTime(a.addedAt);
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

  const rows = sorted.map((item) => {
    const word = item.lexeme;
    const mastery = Math.round(
      ((item.recognition + item.meaningRecall + item.production + item.contextualUsage) / 4) * 100,
    );
    return {
      id: word.id,
      label: formatLexemeLabel(word),
      translations: word.translations.map(({ id, language, text }) => ({ id, language, text })),
      cefrLevel: word.cefrLevel,
      state: item.state,
      mastery,
      isDue: !item.nextReviewAt || dateTime(item.nextReviewAt) <= nowTime,
      isWeak: mastery < 45,
    };
  });

  return (
    <main className="page vocabulary-page">
      <VocabularyScrollRestoration />
      <VocabularyDisplay
        preferredTranslation={course.explanationLanguage}
        rows={rows}
        total={items.length}
        current={current}
        partOfSpeechOptions={partOfSpeechOptions}
        levelOptions={LEVELS.map((level) => ({ value: level, label: level }))}
      />
    </main>
  );
}
