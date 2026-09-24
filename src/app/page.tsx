import Link from "next/link";
import { ArrowRight, BookOpenText, FileUp, GitCompareArrows, Layers3, MessageCircle, Network, PenLine, Plus, ScanText, Star, Swords, Target, TimerReset, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const now = new Date();

  const [total, due, weakProduction, mistakes] = await Promise.all([
    db.userVocabulary.count({ where: { userId: user.id } }),
    db.userVocabulary.count({
      where: { userId: user.id, OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }] },
    }),
    db.userVocabulary.count({ where: { userId: user.id, production: { lt: 0.4 } } }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
  ]);

  return (
    <main className="page">
      <section className="home-focus">
        <p className="home-kicker">Today</p>
        <h1>{due > 0 ? `${due} ${due === 1 ? "word" : "words"} due` : "You're caught up"}</h1>
        <div className="hero-actions">
          <Link className="button button-primary" href={due > 0 ? "/review" : "/practice"}>
            {due > 0 ? "Start review" : "Practice"}
            <ArrowRight size={18} />
          </Link>
          <Link className="button button-secondary" href="/vocabulary/new">
            <Plus size={18} /> Add word
          </Link>
        </div>
      </section>

      <section className="home-metrics" aria-label="Learning status">
        <Link href="/vocabulary"><strong>{total}</strong><span>words</span></Link>
        <Link href="/practice"><strong>{weakProduction}</strong><span>weak</span></Link>
        <Link href="/mistakes"><strong>{mistakes}</strong><span>mistakes</span></Link>
      </section>

      <section className="discovery-grid" aria-label="More ways to learn">
        <Link href="/focus" className="discovery-link">
          <TimerReset size={20} /><span>Focus session</span><ArrowRight size={17} />
        </Link>
        <Link href="/recommendations" className="discovery-link">
          <Star size={20} /><span>Recommendations</span><ArrowRight size={17} />
        </Link>
        <Link href="/universe" className="discovery-link">
          <Network size={20} /><span>Vocabulary Universe</span><ArrowRight size={17} />
        </Link>
        <Link href="/compare" className="discovery-link">
          <GitCompareArrows size={20} /><span>Compare words</span><ArrowRight size={17} />
        </Link>
        <Link href="/conversation" className="discovery-link">
          <MessageCircle size={20} /><span>Conversation</span><ArrowRight size={17} />
        </Link>
        <Link href="/missions" className="discovery-link">
          <Target size={20} /><span>Vocabulary missions</span><ArrowRight size={17} />
        </Link>
        <Link href="/battles" className="discovery-link">
          <Swords size={20} /><span>Vocabulary Battles</span><ArrowRight size={17} />
        </Link>
        <Link href="/writing" className="discovery-link">
          <PenLine size={20} /><span>Writing exam</span><ArrowRight size={17} />
        </Link>
        <Link href="/topic-packs" className="discovery-link">
          <Layers3 size={20} /><span>Topic packs</span><ArrowRight size={17} />
        </Link>
        <Link href="/stories" className="discovery-link">
          <BookOpenText size={20} /><span>Stories</span><ArrowRight size={17} />
        </Link>
        <Link href="/read" className="discovery-link">
          <ScanText size={20} /><span>Reading</span><ArrowRight size={17} />
        </Link>
        <Link href="/import" className="discovery-link">
          <FileUp size={20} /><span>Import</span><ArrowRight size={17} />
        </Link>
        <Link href="/progress" className="discovery-link">
          <TrendingUp size={20} /><span>Progress</span><ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
