import Link from "next/link";
import { ArrowRight, BookOpenText, Layers3, Plus, Sparkles } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const now = new Date();

  const [total, due, weakProduction, mistakes, usage] = await Promise.all([
    db.userVocabulary.count({ where: { userId: user.id } }),
    db.userVocabulary.count({
      where: {
        userId: user.id,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
    }),
    db.userVocabulary.count({
      where: { userId: user.id, production: { lt: 0.4 } },
    }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
    db.aiUsageEvent.aggregate({
      where: { userId: user.id },
      _sum: { totalTokens: true },
    }),
  ]);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">TODAY · GERMAN VOCABULARY</p>
        <h1>Build vocabulary you can actually use.</h1>
        <p className="hero-copy">
          Review what is due, practice weak production, and grow your lexical
          system with AI-assisted context instead of isolated flashcards.
        </p>

        <div className="hero-actions">
          <Link className="button button-primary" href="/review">
            Review {due} due
            <ArrowRight size={18} />
          </Link>
          <Link className="button button-secondary" href="/practice">
            <Sparkles size={18} />
            Adaptive practice
          </Link>
          <Link className="button button-secondary" href="/vocabulary/new">
            <Plus size={18} />
            Add word
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Lexical units" value={total} detail="Personal vocabulary" />
        <StatCard label="Due now" value={due} detail="FSRS review queue" />
        <StatCard label="Weak production" value={weakProduction} detail="Need active recall" />
        <StatCard label="Open mistakes" value={mistakes} detail="Targeted weaknesses" />
      </section>

      <section className="discovery-grid">
        <Link href="/topic-packs" className="panel discovery-card">
          <Layers3 size={22} />
          <div>
            <p className="eyebrow">TOPIC PACKS</p>
            <h2>Learn for a real situation</h2>
            <p className="muted">Generate focused lexical collections for work, travel, bureaucracy, technology, and more.</p>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link href="/stories" className="panel discovery-card">
          <BookOpenText size={22} />
          <div>
            <p className="eyebrow">AI STORIES</p>
            <h2>Meet weak words in context</h2>
            <p className="muted">Generate level-appropriate German reading around vocabulary you are learning.</p>
          </div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="panel dashboard-callout">
        <div>
          <p className="eyebrow">OPENAI USAGE</p>
          <h2>{(usage._sum.totalTokens ?? 0).toLocaleString()} tokens tracked</h2>
          <p className="muted">
            Every implemented AI request now records token metadata in Neon.
          </p>
        </div>
        <Link href="/usage" className="text-link">
          View usage <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
