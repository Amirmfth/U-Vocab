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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <h1>{t("conversation.title")}</h1>
      </section>

      <ConversationStartForm initialMode={params.mode === "MISSION" ? "MISSION" : "PRACTICE"} />

      {sessions.length ? (
        <section className="page-section flex flex-col gap-3">
          <h2 className="section-title uv-margin-83bba30fc1 text-uv-f19feeb881c text-uv-text-soft uv-letter-spacing-235f37bdea">{t("conversation.recent")}</h2>
          <div className="collection-list flex flex-col">
            {sessions.map((session) => (
              <Link
                href={"/conversation/" + session.id}
                className="collection-row uv-border-bottom-8d7f82f403 min-h-16 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface"
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
        <div className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <MessageCircle size={21} />
          <strong>{t("conversation.none")}</strong>
        </div>
      )}
    </main>
  );
}
