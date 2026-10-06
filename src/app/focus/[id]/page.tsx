import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { abandonFocusSession, completeFocusStep } from "../actions";

export default async function FocusSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([
    params,
    getCurrentUser(),
    getCurrentCourse(),
  ]);

  const session = await db.learningSession.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!session) notFound();

  const active =
    session.items.find((item) => !item.completedAt) ??
    session.items.at(-1) ??
    null;

  return (
    <main className="page focus-page">
      <section className="page-header compact">
        <p className="eyebrow">{session.plannedMinutes}-minute focus</p>
        <h1>{session.status === "COMPLETED" ? "Session complete" : "Your learning plan"}</h1>
      </section>

      <section className="panel">
        <ol className="history-list">
          {session.items.map((item) => (
            <li className="history-row" key={item.id}>
              <span>
                <strong>{item.title}</strong>
                {item.description ? <small>{item.description}</small> : null}
              </span>
              <small>{item.plannedMinutes} min {item.completedAt ? "· done" : ""}</small>
            </li>
          ))}
        </ol>
      </section>

      {session.status === "ACTIVE" && active ? (
        <section className="panel">
          <p className="eyebrow">Current segment</p>
          <h2>{active.title}</h2>
          <p className="muted">{active.description}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={active.href}>Open activity</Link>
            <form action={completeFocusStep}>
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="itemId" value={active.id} />
              <button className="button button-secondary" type="submit">Mark complete</button>
            </form>
          </div>
        </section>
      ) : null}

      {session.status === "ACTIVE" ? (
        <form action={abandonFocusSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="text-button" type="submit">End session</button>
        </form>
      ) : (
        <Link className="button button-primary" href="/focus">Plan another session</Link>
      )}
    </main>
  );
}
