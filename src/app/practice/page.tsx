import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise } from "@/lib/exercises/build";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";

export const dynamic = "force-dynamic";

export default async function PracticePage({ searchParams }: {
  searchParams: Promise<{ lexeme?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const item = await db.userVocabulary.findFirst({
    where: { userId: user.id, ...(params.lexeme ? { lexemeId: params.lexeme } : {}) },
    include: { lexeme: { include: { patterns: true, translations: true, examples: true } } },
    orderBy: params.lexeme ? undefined : [
      { production: "asc" }, { contextualUsage: "asc" }, { meaningRecall: "asc" }, { addedAt: "asc" },
    ],
  });

  if (!item) {
    return (
      <main className="page focus-page">
        <section className="empty-state compact-empty">
          <strong>{params.lexeme ? "Word not found in your vocabulary" : "Add a word to start practicing"}</strong>
          {!params.lexeme ? <Link href="/vocabulary/new" className="button button-primary"><Plus size={18} />Add word</Link> : null}
        </section>
      </main>
    );
  }

  const mistakes = await db.mistake.findMany({
    where: { userId: user.id, lexemeId: item.lexemeId, resolvedAt: null },
    select: { type: true }, orderBy: { lastOccurredAt: "desc" },
  });
  const exerciseType = selectExerciseType({
    recognition: item.recognition, meaningRecall: item.meaningRecall,
    production: item.production, contextualUsage: item.contextualUsage,
    mistakeTypes: mistakes.map((mistake) => mistake.type),
  });
  const exercise = buildExercise(exerciseType, item.lexeme, user.preferredTranslation);

  return (
    <main className="page focus-page">
      <div className="focus-meta"><span>Practice</span><span>{item.lexeme.lemma}</span></div>
      <PracticeForm userVocabularyId={item.id} exercise={exercise} />
    </main>
  );
}
