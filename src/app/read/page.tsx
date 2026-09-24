import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, ScanText } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { ReadingForm } from "./ReadingForm";
import { getCachedReadingIndex } from "@/lib/cached-data";


export default async function ReadPage() {
  await connection();
  const user = await getCurrentUser();
  const documents = await getCachedReadingIndex(user.id);

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
                prefetch
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
