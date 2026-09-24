import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise } from "@/lib/exercises/build";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ lexeme?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  const item = await db.userVocabulary.findFirst({
    where: {
      userId: user.id,
      ...(params.lexeme ? { lexemeId: params.lexeme } : {}),
    },
    include: {
      lexeme: {
        include: {
          patterns: true,
          translations: true,
          examples: true,
        },
      },
    },
    orderBy: params.lexeme
      ? undefined
      : [
          { production: "asc" },
          { contextualUsage: "asc" },
          { meaningRecall: "asc" },
          { addedAt: "asc" },
        ],
  });

  if (!item) {
    return (
      <main className="page">
        <section className="page-header compact">
          <p className="eyebrow">PRACTICE</p>
          <h1 style={{ fontSize: "3rem" }}>Active recall</h1>
        </section>
        <p className="eyebrow">
          {params.lexeme
            ? "That lexical unit is not in your personal vocabulary."
            : "Add vocabulary before starting practice."}
        </p>
      </main>
    );
  }

  const mistakes = await db.mistake.findMany({
    where: {
      userId: user.id,
      lexemeId: item.lexemeId,
      resolvedAt: null,
    },
    select: { type: true },
    orderBy: { lastOccurredAt: "desc" },
  });

  const exerciseType = selectExerciseType({
    recognition: item.recognition,
    meaningRecall: item.meaningRecall,
    production: item.production,
    contextualUsage: item.contextualUsage,
    mistakeTypes: mistakes.map((mistake) => mistake.type),
  });

  const exercise = buildExercise(
    exerciseType,
    item.lexeme,
    user.preferredTranslation,
  );

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">
          {mistakes.length ? "TARGETED WEAKNESS PRACTICE" : "ADAPTIVE ACTIVE RECALL"}
        </p>
        <h1 style={{ fontSize: "3rem" }}>Practice what is weakest.</h1>
        <p className="eyebrow">
          {item.lexeme.lemma} · {exercise.type.replaceAll("_", " ").toLowerCase()}
        </p>
      </section>

      <PracticeForm
        userVocabularyId={item.id}
        lemma={item.lexeme.lemma}
        exercise={exercise}
      />
    </main>
  );
}
