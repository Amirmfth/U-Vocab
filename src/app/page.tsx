import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Plus,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { startOperation } from "@/lib/performance";
import { connection } from "next/server";
import { getCachedHomeStats } from "@/lib/cached-data";

export default async function Home() {
  await connection();
  const perf = startOperation("page.home");
  const user = await perf.span("auth", () => getCurrentUser());
  const { total, due, weakProduction, mistakes, recent, today } =
    await perf.span("dbRead", () =>
      getCachedHomeStats(user.id, user.timezone),
    );

  perf.success({ totalWords: total, dueWords: due, openMistakes: mistakes });

  const nextHref =
    due > 0
      ? "/review"
      : mistakes > 0
        ? "/mistakes"
        : weakProduction > 0
          ? "/rescue"
          : "/practice";
  const nextLabel =
    due > 0
      ? "Start review"
      : mistakes > 0
        ? "Fix mistakes"
        : weakProduction > 0
          ? "Rescue weak words"
          : "Choose practice";

  return (
    <main className="page">
      <section className="home-focus">
        <p className="home-kicker">Today</p>
        <h1>
          {due > 0
            ? due + " " + (due === 1 ? "word" : "words") + " due"
            : "You're caught up"}
        </h1>
        <p className="page-description">
          {due > 0
            ? "Clear your review queue first, then move into skill practice."
            : mistakes > 0
              ? "Your review queue is clear. A few recurring mistakes are ready for attention."
              : "Your review queue is clear. Continue with the area that needs the most use."}
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href={nextHref}>
            {nextLabel}
            <ArrowRight size={18} />
          </Link>
          <Link className="button button-secondary" href="/vocabulary/new">
            <Plus size={18} /> Add word
          </Link>
        </div>
      </section>

      {recent ? (
        <section className="panel home-continue">
          <div>
            <p className="eyebrow">CONTINUE</p>
            <h2>{recent.label}</h2>
            <p className="muted">{recent.detail}</p>
          </div>
          <Link href={recent.href} className="button button-secondary">
            Continue <ArrowRight size={17} />
          </Link>
        </section>
      ) : null}

      <section className="home-today-activity" aria-label="Today's activity">
        <div><strong>{today.minutes}</strong><span>minutes</span></div>
        <div><strong>{today.reviews}</strong><span>reviewed</span></div>
        <div><strong>{today.added}</strong><span>added</span></div>
      </section>

      <section className="home-metrics" aria-label="Learning status">
        <Link href="/vocabulary">
          <strong>{total}</strong>
          <span>words</span>
        </Link>
        <Link href="/vocabulary?status=WEAK">
          <strong>{weakProduction}</strong>
          <span>weak production</span>
        </Link>
        <Link href="/mistakes">
          <strong>{mistakes}</strong>
          <span>open mistakes</span>
        </Link>
      </section>

      <section className="home-next-grid" aria-label="Next learning actions">
        <Link href="/review" className="panel home-next-card">
          <div className="ia-card-icon"><Brain size={19} /></div>
          <div>
            <p className="eyebrow">MAINTAIN</p>
            <h2>Review</h2>
            <p>
              {due > 0
                ? due + " due now. Keep recall stable before adding more load."
                : "No reviews due. Mistakes and rescue modes are still available."}
            </p>
          </div>
          <span className="ia-card-link">Open Review <ArrowRight size={16} /></span>
        </Link>

        <Link href="/practice" className="panel home-next-card">
          <div className="ia-card-icon"><Sparkles size={19} /></div>
          <div>
            <p className="eyebrow">APPLY</p>
            <h2>Practice</h2>
            <p>Move into Writing, Reading, Speaking, or a quick vocabulary drill.</p>
          </div>
          <span className="ia-card-link">Choose a skill <ArrowRight size={16} /></span>
        </Link>

        {mistakes > 0 ? (
          <Link href="/mistakes" className="panel home-next-card">
            <div className="ia-card-icon"><TriangleAlert size={19} /></div>
            <div>
              <p className="eyebrow">RECOMMENDED</p>
              <h2>Clean up mistakes</h2>
              <p>
                {mistakes} unresolved mistake{mistakes === 1 ? "" : "s"} can be
                reinforced now.
              </p>
            </div>
            <span className="ia-card-link">Review mistakes <ArrowRight size={16} /></span>
          </Link>
        ) : null}
      </section>

      <section className="panel home-progress-callout">
        <div>
          <p className="eyebrow">PROGRESS</p>
          <h2>See the full learning picture</h2>
          <p className="muted">
            Review retention, activity, skill balance, workload, and topic coverage.
          </p>
        </div>
        <Link href="/progress" className="button button-secondary">
          <TrendingUp size={17} />
          View full progress
        </Link>
      </section>
    </main>
  );
}
