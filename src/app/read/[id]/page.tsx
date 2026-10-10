import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { ReadingViewer } from "./ReadingViewer";
import { RecordEncountersForm } from "./RecordEncountersForm";


export default async function ReadingDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user, course] = await Promise.all([params, getCurrentUser(), getCurrentCourse()]);

  const document = await db.readingDocument.findFirst({
    where: { id, userId: user.id, userCourseId: course.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          lexeme: {
            include: {
              translations: true,
              patterns: true,
              examples: { take: 2 },
              outgoing: {
                where: { type: "COLLOCATION" },
                include: { target: true },
                take: 6,
              },
              userStates: {
                where: { userCourseId: course.id },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!document) notFound();

  const items = document.items.map((item) => {
    const userState = item.lexeme.userStates[0]?.state;
    const state =
      !userState
        ? "UNKNOWN"
        : ["MASTERED", "MAINTENANCE", "ACTIVE"].includes(userState)
          ? "KNOWN"
          : "LEARNING";

    return {
      id: item.id,
      lexemeId: item.lexemeId,
      surfaceText: item.surfaceText,
      surfaceForms: item.surfaceForms as string[],
      lemma: item.lexeme.lemma,
      article: item.lexeme.article,
      partOfSpeech: item.lexeme.partOfSpeech,
      state: state as "KNOWN" | "LEARNING" | "UNKNOWN",
      translations: item.lexeme.translations.map((translation) => ({
        language: translation.language,
        text: translation.text,
      })),
      patterns: item.lexeme.patterns.map((pattern) => ({
        pattern: pattern.pattern,
        explanation: pattern.explanation,
      })),
      examples: item.lexeme.examples.map((example) => ({
        german: example.targetText,
        english: example.english,
        persian: example.persian,
      })),
      collocations: item.lexeme.outgoing.map((relation) => relation.target.lemma),
    };
  });

  const counts = {
    known: items.filter((item) => item.state === "KNOWN").length,
    learning: items.filter((item) => item.state === "LEARNING").length,
    unknown: items.filter((item) => item.state === "UNKNOWN").length,
  };

  return (
    <main className="page reading-document-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-892728be72 in-reading-layout:gap-3.5 in-reading-text-panel:padding-18px-16px-24px in-reading-text-panel:border-1px-solid-border-2 in-reading-text-panel:rounded-exact-radius-lg in-reading-text-panel:bg-linear-gradient-180deg-rgb-255-255-255-0p018-transparent-16r in-reading-legend:pb-3 in-reading-legend:border-1px-solid-border in-reading-text:max-width-72ch in-reading-text:text-uv-c4a6c6c2161 in-reading-text:text-exact-clamp-1p06rem-4p2vw-1p22rem in-reading-text:line-height-1p95 in-reading-token:rounded-exact-5px in-reading-token-unknown:bg-uv-c2c21e945f5 in-reading-token-learning:bg-uv-c72a092dc62 uv-min620:in-reading-text-panel:padding-22px-24px-30px uv-min940:in-reading-layout:grid-template-columns-minmax-0-1p75fr-minmax-290px-0p72fr uv-min940:in-reading-layout:gap-5">
      <section className="page-header compact reading-document-header flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 max-w-uv-a9051779da in-h1:text-exact-clamp-2p25rem-9vw-4p4rem">
        <Link href="/read" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-exact-0p82rem">
          <ArrowLeft size={16} />
          Reading mode
        </Link>
        <h1>{document.title ?? "Reading"}</h1>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          {document.level ? <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{document.level}</span> : null}
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{counts.known} known</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{counts.learning} learning</span>
          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{counts.unknown} unknown</span>
        </div>
      </section>

      <ReadingViewer
        documentId={document.id}
        content={document.content}
        items={items}
        translationPreference={course.explanationLanguage}
      />

      <RecordEncountersForm documentId={document.id} />
    </main>
  );
}
