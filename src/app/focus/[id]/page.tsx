import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, X } from "lucide-react";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { abandonFocusSession, completeFocusStep } from "../actions";

export const dynamic = "force-dynamic";

export default async function FocusSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const session = await db.learningSession.findFirst({
    where: { id, userId: user.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { lexeme: true },
      },
    },
  });

  if (!session) notFound();

  const completed = session.items.filter((item) => item.completedAt).length;
  const planned = session.items.reduce((sum, item) => sum + item.plannedMinutes, 0);

  if (session.status === "COMPLETED") {
    return (
      <main className="page focus-page">
        <section className="page-header compact">
          <Link href="/focus" className="back-link">
            <ArrowLeft size={16} />
            Focus
          </Link>
          <CheckCircle2 className="rescue-complete-icon" size={30} />
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1>
            {session.kind === "DAILY_CHALLENGE"
              ? "Daily challenge complete"
              : session.plannedMinutes + "-minute focus complete"}
          </h1>
          <p className="page-description">
            {completed} activities completed · {planned} planned minutes
          </p>
        </section>

        <section className="session-summary-list">
          {session.items.map((item) => (
            <article className="session-summary-row" key={item.id}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.activity.replaceAll("_", " ").toLowerCase()} · {item.plannedMinutes} min</span>
              </div>
            </article>
          ))}
        </section>

        <div className="progress-actions">
          <Link href="/focus" className="button button-primary">Start another session</Link>
          <Link href="/progress" className="button button-secondary">View progress</Link>
        </div>
      </main>
    );
  }

  const step = Math.min(session.currentStep, Math.max(session.items.length - 1, 0));
  const current = session.items[step];

  if (!current) {
    return (
      <main className="page focus-page">
        <section className="empty-state">
          <strong>No activities could be planned.</strong>
          <Link href="/vocabulary/new" className="button button-primary">Add vocabulary</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page focus-page">
      <section className="focus-meta">
        <Link href="/focus" className="back-link">
          <ArrowLeft size={16} />
          Focus
        </Link>
        <span>{step + 1} / {session.items.length}</span>
      </section>

      <div className="session-progress" aria-label={"Session progress " + completed + " of " + session.items.length}>
        <span style={{ width: Math.round((completed / session.items.length) * 100) + "%" }} />
      </div>

      <section className="panel session-activity">
        <div className="word-meta">
          <span className="badge">{current.activity.replaceAll("_", " ")}</span>
          <span className="badge">{current.plannedMinutes} min</span>
        </div>

        <h1>{current.title}</h1>
        {current.description ? <p className="page-description">{current.description}</p> : null}

        {current.lexeme ? (
          <p className="session-target">
            Target: {current.lexeme.article ? current.lexeme.article + " " : ""}{current.lexeme.lemma}
          </p>
        ) : null}

        <div className="session-actions">
          <Link href={current.href} className="button button-primary">
            Open activity <ExternalLink size={17} />
          </Link>

          <form action={completeFocusStep}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="itemId" value={current.id} />
            <ActionButton variant="secondary" pendingLabel="Saving progress…">
              Done & next <ArrowRight size={17} />
            </ActionButton>
          </form>
        </div>
      </section>

      <section className="session-plan-list" aria-label="Session plan">
        {session.items.map((item, index) => (
          <div
            className={
              "session-plan-row " +
              (item.completedAt ? "is-complete " : "") +
              (index === step ? "is-current" : "")
            }
            key={item.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.plannedMinutes} min</small>
            </div>
            {item.completedAt ? <CheckCircle2 size={16} /> : null}
          </div>
        ))}
      </section>

      <form action={abandonFocusSession}>
        <input type="hidden" name="sessionId" value={session.id} />
        <ActionButton variant="secondary" pendingLabel="Ending session…">
          <X size={17} />
          End session
        </ActionButton>
      </form>
    </main>
  );
}
