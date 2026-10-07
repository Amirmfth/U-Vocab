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
    <main className="page reading-document-page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px] [width:100%] [max-width:1120px] [&_.reading-layout]:[gap:14px] [&_.reading-text-panel]:[padding:18px_16px_24px] [&_.reading-text-panel]:[border:1px_solid_var(--border)] [&_.reading-text-panel]:[border-radius:var(--radius-lg)] [&_.reading-text-panel]:[background:linear-gradient(180deg,_rgba(255,255,255,0.018),_transparent_16rem),_var(--surface)] [&_.reading-legend]:[padding-bottom:12px] [&_.reading-legend]:[border-bottom:1px_solid_var(--border)] [&_.reading-text]:[max-width:72ch] [&_.reading-text]:[color:#d4d4dc] [&_.reading-text]:[font-size:clamp(1.06rem,_4.2vw,_1.22rem)] [&_.reading-text]:[line-height:1.95] [&_.reading-token]:[border-radius:5px] [&_.reading-token.unknown]:[background:rgba(139,_124,_255,_0.11)] [&_.reading-token.learning]:[background:rgba(240,_179,_91,_0.07)] min-[620px]:[&_.reading-text-panel]:[padding:22px_24px_30px] min-[940px]:[&_.reading-layout]:[grid-template-columns:minmax(0,_1.75fr)_minmax(290px,_0.72fr)] min-[940px]:[&_.reading-layout]:[gap:20px]">
      <section className="page-header compact reading-document-header [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [max-width:860px] [&_h1]:[font-size:clamp(2.25rem,_9vw,_4.4rem)]">
        <Link href="/read" className="back-link [width:fit-content] [min-height:40px] [display:inline-flex] [align-items:center] [gap:7px] [color:var(--text-muted)] [font-size:0.82rem]">
          <ArrowLeft size={16} />
          Reading mode
        </Link>
        <h1>{document.title ?? "Reading"}</h1>
        <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
          {document.level ? <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{document.level}</span> : null}
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{counts.known} known</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{counts.learning} learning</span>
          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{counts.unknown} unknown</span>
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
