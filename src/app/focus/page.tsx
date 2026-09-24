import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Clock3, Flame, Play } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { createFocusSession } from "./actions";


export default async function FocusPage() {
  await connection();
  const user = await getCurrentUser();

  const [active, recent] = await Promise.all([
    db.learningSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { _count: { select: { items: true } } },
      orderBy: { lastActiveAt: "desc" },
    }),
    db.learningSession.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      include: { _count: { select: { items: true } } },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">DAILY LEARNING</p>
        <h1>Focus</h1>
        <p className="page-description">
          A deterministic plan from due reviews, weak vocabulary, new words, context, and production.
        </p>
      </section>

      {active ? (
        <section className="panel focus-resume">
          <div>
            <p className="eyebrow">RESUME</p>
            <h2>{active.kind === "DAILY_CHALLENGE" ? "Daily challenge" : active.plannedMinutes + "-minute focus"}</h2>
            <p className="muted">
              Step {Math.min(active.currentStep + 1, active._count.items)} of {active._count.items}
            </p>
          </div>
          <Link className="button button-primary" href={"/focus/" + active.id}>
            Resume <ArrowRight size={17} />
          </Link>
        </section>
      ) : null}

      <section className="focus-options">
        <form action={createFocusSession} className="focus-option primary">
          <input type="hidden" name="kind" value="DAILY_CHALLENGE" />
          <input type="hidden" name="minutes" value="12" />
          <Flame size={22} />
          <div>
            <strong>Daily challenge</strong>
            <span>Compact mixed practice · about 12 min</span>
          </div>
          <ActionButton variant="secondary" pendingLabel="Starting…">
            <Play size={17} />
            Start
          </ActionButton>
        </form>

        {[15, 30, 45, 60].map((minutes) => (
          <form action={createFocusSession} className="focus-option" key={minutes}>
            <input type="hidden" name="kind" value="FOCUS" />
            <input type="hidden" name="minutes" value={minutes} />
            <Clock3 size={21} />
            <div>
              <strong>{minutes} minutes</strong>
              <span>Adaptive learning block</span>
            </div>
            <ActionButton variant="secondary" pendingLabel="Starting…">
              <Play size={17} />
              Start
            </ActionButton>
          </form>
        ))}
      </section>

      {recent.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent sessions</h2>
          <div className="collection-list">
            {recent.map((session) => (
              <Link href={"/focus/" + session.id} className="collection-row" key={session.id}>
                <div>
                  <strong>
                    {session.kind === "DAILY_CHALLENGE"
                      ? "Daily challenge"
                      : session.plannedMinutes + "-minute focus"}
                  </strong>
                  <span>{session._count.items} activities · completed</span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
