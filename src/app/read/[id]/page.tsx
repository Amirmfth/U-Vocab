import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ReadingViewer } from "./ReadingViewer";
import { RecordEncountersForm } from "./RecordEncountersForm";


export default async function ReadingDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);

  const document = await db.readingDocument.findFirst({
    where: { id, userId: user.id },
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
                where: { userId: user.id },
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
        german: example.german,
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
    <main className="page reading-document-page">
      <section className="page-header compact reading-document-header">
        <Link href="/read" className="back-link">
          <ArrowLeft size={16} />
          Reading mode
        </Link>
        <h1>{document.title ?? "Reading"}</h1>
        <div className="word-meta">
          {document.level ? <span className="badge">{document.level}</span> : null}
          <span className="badge">{counts.known} known</span>
          <span className="badge">{counts.learning} learning</span>
          <span className="badge">{counts.unknown} unknown</span>
        </div>
      </section>

      <ReadingViewer
        documentId={document.id}
        content={document.content}
        items={items}
        translationPreference={user.preferredTranslation}
      />

      <RecordEncountersForm documentId={document.id} />
    </main>
  );
}
