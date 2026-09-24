import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { PracticeForm } from "./PracticeForm";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await getCurrentUser();
  const item = await db.userVocabulary.findFirst({
    where: { userId: user.id },
    include: { lexeme: { include: { patterns: true } } },
    orderBy: [{ production: "asc" }, { addedAt: "asc" }],
  });

  return (
    <main>
      <div className="hero">
        <p className="muted">PRACTICE</p>
        <h1 style={{ fontSize: "3rem" }}>Produce, don’t just recognize.</h1>
      </div>
      {item ? (
        <PracticeForm
          userVocabularyId={item.id}
          lemma={item.lexeme.lemma}
          patterns={item.lexeme.patterns.map((pattern) => pattern.pattern)}
        />
      ) : (
        <p className="muted">Add vocabulary before starting production practice.</p>
      )}
    </main>
  );
}
