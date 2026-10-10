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
    <main className="page writing-hub flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-2e0eb67d1b uv-vd57432bcf0:max-w-uv-e83c9a8a13 uv-vd57432bcf0:gap-4 uv-vd57432bcf0:p-4.5 uv-vd57432bcf0:border-uv-border-strong uv-vd57432bcf0:uv-background-21ade80306 uv-v50b16c018b:min-h-13 uv-v1506e77c3f:uv-border-top-8d7f82f403 uv-vfb6c9a8dbe:min-h-17 uv-vfb6c9a8dbe:px-1 uv-min620:uv-vd57432bcf0:p-5.5 uv-min940:pt-3 uv-min940:uv-vd57432bcf0:grid uv-min940:uv-vd57432bcf0:uv-grid-template-columns-dd0b1a1848 uv-min940:uv-vb8771597ac:uv-grid-column-93b665dfb5 uv-min940:uv-vad477e2d1d:uv-grid-column-93b665dfb5 uv-min940:uv-v6a8e1fa92d:uv-grid-column-93b665dfb5 uv-min940:uv-v151a72fcb3:uv-grid-column-93b665dfb5">
      <section className="page-header compact practice-workbench-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 uv-max-width-5a165b8e65 pt-5 uv-v3bccf64584:text-uv-fe7a9e3765c">
        <h1>{t("writing.title")}</h1>
      </section>

      <WritingStartForm defaultLevel={course.currentLevel} />

      {sessions.length ? (
        <section className="page-section flex flex-col gap-3">
          <h2 className="section-title uv-margin-83bba30fc1 text-uv-f19feeb881c text-uv-text-soft uv-letter-spacing-235f37bdea">{t("writing.recent")}</h2>
          <div className="collection-list flex flex-col">
            {sessions.map((session) => (
              <Link href={"/writing/" + session.id} className="collection-row uv-border-bottom-8d7f82f403 min-h-16 grid uv-grid-template-columns-f06dd92ea5 items-center gap-3 uv-padding-c9f5e3c335 uv-veda02a0adb:block uv-v36c0309a03:block uv-v36c0309a03:mt-0.75 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f74fc13de71 uv-min940:hover:bg-uv-surface" key={session.id} prefetch>
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
        <div className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <PenLine size={22} />
          <strong>{t("writing.none")}</strong>
        </div>
      )}
    </main>
  );
}
