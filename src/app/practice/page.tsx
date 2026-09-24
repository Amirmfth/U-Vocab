import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise } from "@/lib/exercises/build";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await getCurrentUser();

  const item = await db.userVocabulary.findFirst({
    where: { userId: user.id },
    include: {
      lexeme: {
        include: {
          patterns: true,
          translations: true,
          examples: true,
        },
      },
    },
    orderBy: [
      { production: "asc" },
      { contextualUsage: "asc" },
      { meaningRecall: "asc" },
      { addedAt: "asc" },
    ],
  });

  if (!item) {
    return (
      <main>
        <div className="hero">
          <p className="muted">PRACTICE</p>
          <h1 style={{ fontSize: "3rem" }}>Active recall</h1>
        </div>
        <p className="muted">Add vocabulary before starting practice.</p>
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
    <main>
      <div className="hero">
        <p className="muted">ADAPTIVE ACTIVE RECALL</p>
        <h1 style={{ fontSize: "3rem" }}>Practice what is weakest.</h1>
        <p className="muted">
          Exercise type: {exercise.type.replaceAll("_", " ").toLowerCase()}
        </p>
      </div>

      <PracticeForm
        userVocabularyId={item.id}
        lemma={item.lexeme.lemma}
        exercise={exercise}
      />
    </main>
  );
}
