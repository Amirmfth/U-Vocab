import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getServerTranslator } from "@/i18n/server";
import { WritingStartForm } from "./WritingStartForm";
import { getCachedWritingIndex } from "@/lib/cached-data";

export default async function WritingPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const { t } = await getServerTranslator(user);
  const sessions = await getCachedWritingIndex(user.id, course.id);

  return (
    <main className="page writing-hub">
      <section className="page-header compact practice-workbench-header">
        <h1>{t("writing.title")}</h1>
      </section>

      <WritingStartForm defaultLevel={course.currentLevel} />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">{t("writing.recent")}</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row" key={session.id} prefetch>
                <div>
                  <strong dir="auto" className="learning-content">{session.topic}</strong>
                  <span>
                    {session.mode === "GUIDED" ? t("writing.guided") : t("writing.open")} ·{" "}
                    {session.level} ·{" "}
                    {session.status === "EVALUATED"
                      ? t("writing.status.evaluated")
                      : t("writing.status.active")}
                  </span>
                </div>
                <ArrowRight className="rtl-mirror" size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <PenLine size={22} />
          <strong>{t("writing.none")}</strong>
        </div>
      )}
    </main>
  );
}
