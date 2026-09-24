import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  MessageCircle,
  PenLine,
  Plus,
  ScanText,
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
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">PRACTICE</p>
        <h1>Use your German</h1>
        <p className="page-description">
          Choose a skill direction. Vocabulary drills stay available as a
          quick secondary mode.
        </p>
      </section>

      <section className="ia-skill-grid" aria-label="Practice skills">
        <article className="panel ia-skill-card">
          <div className="ia-card-icon"><PenLine size={21} /></div>
          <div>
            <p className="eyebrow">WRITING</p>
            <h2>Writing</h2>
            <p>Guided vocabulary, open tasks, exam-style prompts, and rewrites.</p>
          </div>
          <Link href="/writing" className="ia-card-link">
            Open Writing <ArrowRight size={16} />
          </Link>
        </article>

        <article className="panel ia-skill-card">
          <div className="ia-card-icon"><ScanText size={21} /></div>
          <div>
            <p className="eyebrow">READING</p>
            <h2>Reading</h2>
            <p>Analyze pasted text, revisit your reading library, or practice with stories.</p>
          </div>
          <div className="ia-card-actions">
            <Link href="/read" className="ia-card-link">
              Reading library <ArrowRight size={16} />
            </Link>
            <Link href="/stories" className="ia-card-link secondary-link">
              <BookOpenText size={15} /> Stories
            </Link>
          </div>
        </article>

        <article className="panel ia-skill-card">
          <div className="ia-card-icon"><MessageCircle size={21} /></div>
          <div>
            <p className="eyebrow">SPEAKING</p>
            <h2>Speaking</h2>
            <p>Free conversation, scenarios, and vocabulary missions.</p>
          </div>
          <div className="ia-card-actions">
            <Link href="/conversation" className="ia-card-link">
              Conversation <ArrowRight size={16} />
            </Link>
            <Link href="/missions" className="ia-card-link secondary-link">
              <Target size={15} /> Missions
            </Link>
          </div>
        </article>
      </section>

      <section className="panel ia-secondary-panel">
        <div>
          <p className="eyebrow">QUICK MODES</p>
          <h2>Vocabulary practice</h2>
          <p className="muted">
            Drill one weak word or jump into a fast vocabulary battle.
          </p>
        </div>
        <div className="ia-secondary-actions">
          <Link href="/practice?drill=1" className="button button-secondary">
            Quick drill
          </Link>
          <Link href="/battles" className="button button-secondary">
            <Swords size={17} /> Battles
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
