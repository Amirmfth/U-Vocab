import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getServerTranslator } from "@/i18n/server";
import { ConversationStartForm } from "./ConversationStartForm";
import { PersistedFirstUseGuide } from "@/components/PersistedFirstUseGuide";
import { FIRST_USE_GUIDES } from "@/lib/first-use-guidance";

export default async function ConversationPage({ searchParams }: {
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
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.conversation}
        title={t("guidance.conversation.title")}
        description={t("guidance.conversation.body")}
        items={[t("guidance.conversation.item1")]}
        dismissLabel={t("guidance.dismiss")}
      />
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <h1>{t("conversation.title")}</h1>
      </section>

      <ConversationStartForm initialMode={params.mode === "MISSION" ? "MISSION" : "PRACTICE"} />

      {sessions.length ? (
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <h2 className="section-title [margin:0_0_10px] [font-size:1rem] [color:var(--text-soft)] [letter-spacing:-0.02em]">{t("conversation.recent")}</h2>
          <div className="collection-list [display:flex] [flex-direction:column]">
            {sessions.map((session) => (
              <Link
                href={"/conversation/" + session.id}
                className="collection-row [border-bottom:1px_solid_var(--border)] [min-height:64px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [gap:12px] [padding:11px_2px] [&_strong]:[display:block] [&_span]:[display:block] [&_span]:[margin-top:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.76rem] min-[940px]:[&:hover]:[background:var(--surface)]"
                key={session.id}
              >
                <div>
                  <strong className="learning-content" dir="auto">{session.title}</strong>
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
        <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <MessageCircle size={21} />
          <strong>{t("conversation.none")}</strong>
        </div>
      )}
    </main>
  );
}
