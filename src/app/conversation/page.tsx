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
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <PersistedFirstUseGuide
        userId={user.id}
        guide={FIRST_USE_GUIDES.conversation}
        title={t("guidance.conversation.title")}
        description={t("guidance.conversation.body")}
        items={[t("guidance.conversation.item1")]}
        dismissLabel={t("guidance.dismiss")}
      />
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <h1>{t("conversation.title")}</h1>
      </section>

      <ConversationStartForm initialMode={params.mode === "MISSION" ? "MISSION" : "PRACTICE"} />

      {sessions.length ? (
        <section className="page-section flex flex-col gap-3">
          <h2 className="section-title margin-0-0-10px text-uv-f19feeb881c text-uv-text-soft letter-spacing-0p02em-2">{t("conversation.recent")}</h2>
          <div className="collection-list flex flex-col">
            {sessions.map((session) => (
              <Link
                href={"/conversation/" + session.id}
                className="collection-row border-1px-solid-border min-h-16 grid grid-template-columns-minmax-0-1fr-auto items-center gap-3 padding-11px-2px in-strong-2:block in-span:block in-span:mt-0.75 in-span:text-uv-text-muted in-span:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
        <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <MessageCircle size={21} />
          <strong>{t("conversation.none")}</strong>
        </div>
      )}
    </main>
  );
}
