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
    <main className="page reading-document-page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6 w-full max-w-uv-892728be72 uv-v52d0feeaa5:gap-3.5 uv-v46bccf5926:uv-padding-514bb54fe9 uv-v46bccf5926:uv-border-8d7f82f403 uv-v46bccf5926:rounded-uv-r02a0a889dd uv-v46bccf5926:uv-background-00babd1eab uv-v656346ec8b:pb-3 uv-v656346ec8b:uv-border-bottom-8d7f82f403 uv-v1236ed22b4:uv-max-width-d68c0844a8 uv-v1236ed22b4:text-uv-c4a6c6c2161 uv-v1236ed22b4:text-uv-f89e4ddcb5a uv-v1236ed22b4:uv-line-height-45bbb00d06 uv-v1747007e59:rounded-uv-rd176fd99a1 uv-vaae74f2621:bg-uv-c2c21e945f5 uv-v51c7467f02:bg-uv-c72a092dc62 uv-min620:uv-v46bccf5926:uv-padding-04d3dd6682 uv-min940:uv-v52d0feeaa5:uv-grid-template-columns-c8ae4ffd72 uv-min940:uv-v52d0feeaa5:gap-5">
      <section className="page-header compact reading-document-header flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 max-w-uv-a9051779da uv-v3bccf64584:text-uv-fb9b4a66c9a">
        <Link href="/read" className="back-link w-fit min-h-10 inline-flex items-center gap-1.75 text-uv-text-muted text-uv-fa2582d5d6e">
          <ArrowLeft size={16} />
          Reading mode
        </Link>
        <h1>{document.title ?? "Reading"}</h1>
        <div className="word-meta flex flex-wrap gap-1.75 items-center">
          {document.level ? <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{document.level}</span> : null}
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{counts.known} known</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{counts.learning} learning</span>
          <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{counts.unknown} unknown</span>
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
