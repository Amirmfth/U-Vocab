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
    <main className="page writing-hub [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:920px] [&_.writing-start-form]:[max-width:880px] [&_.writing-start-form]:[gap:16px] [&_.writing-start-form]:[padding:18px] [&_.writing-start-form]:[border-color:var(--border-strong)] [&_.writing-start-form]:[background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent_70%),_var(--surface)] [&_.writing-start-form_.button]:[min-height:52px] [&_.collection-list]:[border-top:1px_solid_var(--border)] [&_.collection-row]:[min-height:68px] [&_.collection-row]:[padding-inline:4px] min-[620px]:[&_.writing-start-form]:[padding:22px] min-[940px]:[padding-top:12px] min-[940px]:[&_.writing-start-form]:[display:grid] min-[940px]:[&_.writing-start-form]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[940px]:[&_.writing-start-form_>_.writing-settings-row]:[grid-column:1_/_-1] min-[940px]:[&_.writing-start-form_>_.field]:[grid-column:1_/_-1] min-[940px]:[&_.writing-start-form_>_.status-notice]:[grid-column:1_/_-1] min-[940px]:[&_.writing-start-form_>_.button]:[grid-column:1_/_-1]">
      <section className="page-header compact practice-workbench-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [max-width:var(--content-reading)] [padding-top:20px] [&_h1]:[font-size:clamp(2.5rem,_12vw,_5rem)]">
        <h1>{t("writing.title")}</h1>
      </section>

      <WritingStartForm defaultLevel={course.currentLevel} />

      {sessions.length ? (
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <h2 className="section-title [margin:0_0_10px] [font-size:1rem] [color:var(--text-soft)] [letter-spacing:-0.02em]">{t("writing.recent")}</h2>
          <div className="collection-list [display:flex] [flex-direction:column]">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row [border-bottom:1px_solid_var(--border)] [min-height:64px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [gap:12px] [padding:11px_2px] [&_strong]:[display:block] [&_span]:[display:block] [&_span]:[margin-top:3px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.76rem] min-[940px]:[&:hover]:[background:var(--surface)]" key={session.id} prefetch>
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
        <div className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <PenLine size={22} />
          <strong>{t("writing.none")}</strong>
        </div>
      )}
    </main>
  );
}
