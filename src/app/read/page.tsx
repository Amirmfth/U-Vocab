import Link from "next/link";
import { ArrowRight, ScanText } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ReadingForm } from "./ReadingForm";

export const dynamic = "force-dynamic";

export default async function ReadPage() {
  const user = await getCurrentUser();
  const documents = await db.readingDocument.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">READ</p>
        <h1>Reading mode</h1>
      </section>

      <ReadingForm />

      <section className="page-section">
        <h2 className="section-title">Recent texts</h2>
        {documents.length ? (
          <div className="collection-list">
            {documents.map((document) => (
              <Link
                key={document.id}
                href={"/read/" + document.id}
                className="collection-row"
              >
                <div>
                  <strong>{document.title ?? "Untitled reading"}</strong>
                  <span>
                    {document.level ?? "—"} · {document._count.items} lexical units
                  </span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ScanText size={22} />
            <strong>No analyzed texts yet.</strong>
          </div>
        )}
      </section>
    </main>
  );
}
