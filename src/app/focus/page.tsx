import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { createFocusSession } from "./actions";

export default async function FocusPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const recent = await db.learningSession.findFirst({
    where: { userId: user.id, userCourseId: course.id, kind: "FOCUS", status: "ACTIVE" },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true, plannedMinutes: true },
  });

  return (
    <main className="page focus-page">
      <section className="page-header compact">
        <p className="eyebrow">Personalized session</p>
        <h1>Plan today&apos;s learning</h1>
        <p className="page-description">
          Review urgency, weak production, grammar, and context are balanced into one bounded session.
        </p>
      </section>

      {recent ? (
        <section className="panel">
          <strong>Continue your active {recent.plannedMinutes}-minute session</strong>
          <div className="hero-actions">
            <Link className="button button-primary" href={"/focus/" + recent.id}>Continue</Link>
          </div>
        </section>
      ) : null}

      <form action={createFocusSession} className="panel form-panel">
        <div className="field">
          <label htmlFor="minutes">Session length</label>
          <select id="minutes" name="minutes" defaultValue="15">
            {[5, 10, 15, 20].map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </select>
        </div>
        <button className="button button-primary" type="submit">Create session</button>
      </form>
    </main>
  );
}
