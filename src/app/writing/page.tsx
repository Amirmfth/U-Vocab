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
    <main className="page writing-hub flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b in-writing-start-form:max-w-uv-e83c9a8a13 in-writing-start-form:gap-4 in-writing-start-form:p-4.5 in-writing-start-form:border-uv-border-strong in-writing-start-form:bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-70p in-writing-start-form-button:min-h-13 in-collection-list:border-1px-solid-border-3 in-collection-row:min-h-17 in-collection-row:px-1 uv-min620:in-writing-start-form:p-5.5 uv-min940:pt-3 uv-min940:in-writing-start-form:grid uv-min940:in-writing-start-form:grid-template-columns-repeat-2-minmax-0-1fr uv-min940:in-writing-start-form-writing-settings-row:grid-column-1-1 uv-min940:in-writing-start-form-field:grid-column-1-1 uv-min940:in-writing-start-form-status-notice:grid-column-1-1 uv-min940:in-writing-start-form-button-2:grid-column-1-1">
      <section className="page-header compact practice-workbench-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 max-width-content-reading pt-5 in-h1:text-exact-clamp-2p5rem-12vw-5rem">
        <h1>{t("writing.title")}</h1>
      </section>

      <WritingStartForm defaultLevel={course.currentLevel} />

      {sessions.length ? (
        <section className="page-section flex flex-col gap-3">
          <h2 className="section-title margin-0-0-10px text-exact-1rem text-uv-text-soft letter-spacing-0p02em-2">{t("writing.recent")}</h2>
          <div className="collection-list flex flex-col">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row border-1px-solid-border min-h-16 grid grid-template-columns-minmax-0-1fr-auto items-center gap-3 padding-11px-2px in-strong-2:block in-span:block in-span:mt-0.75 in-span:text-uv-text-muted in-span:text-exact-0p76rem uv-min940:hover:bg-uv-surface" key={session.id} prefetch>
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
        <div className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-exact-radius-lg text-uv-text-soft p-4.25">
          <PenLine size={22} />
          <strong>{t("writing.none")}</strong>
        </div>
      )}
    </main>
  );
}
