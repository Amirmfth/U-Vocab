import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { WritingStartForm } from "./WritingStartForm";
import { getCachedWritingIndex } from "@/lib/cached-data";


export default async function WritingPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const sessions = await getCachedWritingIndex(user.id, course.id);

  return (
    <main className="page writing-hub">
      <section className="page-header compact practice-workbench-header">
        <h1>Writing studio</h1>
      </section>

      <WritingStartForm defaultLevel={course.currentLevel} />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">Recent writing</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row" key={session.id} prefetch>
                <div>
                  <strong>{session.topic}</strong>
                  <span>
                    {session.mode.toLowerCase()} · {session.level} · {session.status.toLowerCase()}
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <PenLine size={22} />
          <strong>No writing attempts yet.</strong>
        </div>
      )}
    </main>
  );
}
