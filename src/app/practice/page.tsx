import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  MessageCircle,
  PenLine,
  Plus,
  ScanText,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { buildExercise } from "@/lib/exercises/build";
import { selectExerciseType } from "@/lib/exercises/select";
import { PracticeForm } from "./PracticeForm";

function PracticeHub() {
  return (
    <main className="page practice-hub">
      <section className="page-header compact practice-header">
        <p className="eyebrow">PRACTICE</p>
        <h1>Use your German</h1>
        <p className="page-description">
          Pick one skill and get into practice quickly.
        </p>
      </section>

      <nav className="practice-lanes" aria-label="Practice skills">
        <Link href="/writing" className="practice-lane">
          <span className="practice-lane-icon"><PenLine size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Writing</strong>
            <small>Guided, open, exam-style, and rewrite practice</small>
          </span>
          <ArrowRight size={18} />
        </Link>

        <Link href="/read" className="practice-lane">
          <span className="practice-lane-icon"><ScanText size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Reading</strong>
            <small>Paste text, revisit your library, and discover vocabulary</small>
          </span>
          <ArrowRight size={18} />
        </Link>

        <Link href="/conversation" className="practice-lane">
          <span className="practice-lane-icon"><MessageCircle size={21} /></span>
          <span className="practice-lane-copy">
            <strong>Speaking</strong>
            <small>Free conversation, scenarios, and vocabulary missions</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      </nav>

      <section className="practice-shortcuts">
        <div className="practice-shortcuts-heading">
          <p className="eyebrow">MORE IN PRACTICE</p>
          <span>Secondary modes</span>
        </div>
        <div className="practice-shortcut-grid">
          <Link href="/stories">
            <BookOpenText size={17} />
            <span><strong>Stories</strong><small>Contextual reading</small></span>
          </Link>
          <Link href="/missions">
            <Target size={17} />
            <span><strong>Missions</strong><small>Goal-based speaking</small></span>
          </Link>
          <Link href="/practice?drill=1">
            <Sparkles size={17} />
            <span><strong>Quick drill</strong><small>Weak vocabulary</small></span>
          </Link>
          <Link href="/battles">
            <Swords size={17} />
            <span><strong>Battles</strong><small>Fast vocabulary mode</small></span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ lexeme?: string; drill?: string }>;
}) {
  await connection();
  const params = await searchParams;

  if (!params.lexeme && params.drill !== "1") {
    return <PracticeHub />;
  }

  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: {
      userId: user.id,
      ...(params.lexeme ? { lexemeId: params.lexeme } : {}),
    },
    include: {
      lexeme: {
        include: { patterns: true, translations: true, examples: true },
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
      <main className="page focus-page">
        <section className="empty-state compact-empty">
          <strong>
            {params.lexeme
              ? "Word not found in your vocabulary"
              : "Add a word to start practicing"}
          </strong>
          {!params.lexeme ? (
            <Link href="/vocabulary/new" className="button button-primary">
              <Plus size={18} />
              Add word
            </Link>
          ) : null}
          <Link href="/practice" className="text-link">Back to Practice</Link>
        </section>
      </main>
    );
  }

  const mistakes = await db.mistake.findMany({
    where: { userId: user.id, lexemeId: item.lexemeId, resolvedAt: null },
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
    <main className="page focus-page">
      <div className="focus-meta">
        <Link href="/practice">Practice</Link>
        <span>{item.lexeme.lemma}</span>
      </div>
      <PracticeForm userVocabularyId={item.id} exercise={exercise} />
    </main>
  );
}
