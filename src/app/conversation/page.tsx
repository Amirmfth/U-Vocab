import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getServerTranslator } from "@/i18n/server";
import { ConversationStartForm } from "./ConversationStartForm";

export default async function ConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await connection();
  const [user, course, params] = await Promise.all([
    getCurrentUser(),
    getCurrentCourse(),
    searchParams,
  ]);
  const { t } = await getServerTranslator(user);
  const sessions = await db.conversationSession.findMany({
    where: { userId: user.id, userCourseId: course.id },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <h1>{t("conversation.title")}</h1>
      </section>

      <ConversationStartForm
        initialMode={params.mode === "MISSION" ? "MISSION" : "PRACTICE"}
      />

      {sessions.length ? (
        <section className="page-section">
          <h2 className="section-title">{t("conversation.recent")}</h2>
          <div className="collection-list">
            {sessions.map((session) => (
              <Link
                href={"/conversation/" + session.id}
                className="collection-row"
                key={session.id}
              >
                <div>
                  <strong className="learning-content" dir="auto">
                    {session.title}
                  </strong>
                  <span>
                    {session.kind === "MISSION"
                      ? t("conversation.mission")
                      : t("conversation.conversation")}{" "}
                    · {session.status.toLowerCase()} · {session.level}
                  </span>
                </div>
                <ArrowRight className="rtl-mirror" size={16} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state compact-empty">
          <MessageCircle size={21} />
          <strong>{t("conversation.none")}</strong>
        </div>
      )}
    </main>
  );
}
