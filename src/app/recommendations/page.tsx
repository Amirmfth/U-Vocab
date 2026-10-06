import { connection } from "next/server";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getVocabularyRecommendations } from "@/lib/recommendations";
import { targetLanguageConfig } from "@/lib/languages";
import { addRecommendation, dismissRecommendation } from "./actions";

function reasonLabel(code: string | undefined) {
  if (!code) return null;
  return code.replaceAll("_", " ").toLowerCase();
}

export default async function RecommendationsPage() {
  await connection();
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const recommendations = await getVocabularyRecommendations(user.id, course.id, 20);
  const targetLanguage = targetLanguageConfig(course.targetLanguage);

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">Personalized vocabulary</p>
        <h1>Recommendations</h1>
        <p className="page-description">
          Deterministic retrieval finds useful candidates; optional low-cost AI only reranks that bounded set.
        </p>
      </section>

      {recommendations.length ? (
        <section className="vocabulary-list">
          {recommendations.map((item, index) => {
            const rationale =
              item.aiReasonCode
                ? reasonLabel(item.aiReasonCode) ?? ""
                : item.reasons[0]?.label ?? "";
            return (
              <article className="vocabulary-row" key={item.lexemeId}>
                <div className="vocabulary-row-main">
                  <Link
                    className="word learning-content"
                    lang={targetLanguage.code}
                    dir="ltr"
                    href={"/vocabulary/" + item.lexemeId}
                  >
                    {item.article ? item.article + " " : ""}{item.lemma}
                  </Link>
                  <div className="translation-line">
                    {item.english ? <span lang="en">{item.english}</span> : null}
                    {item.persian ? <span lang="fa" dir="rtl">{item.persian}</span> : null}
                  </div>
                  <small className="muted">
                    {rationale || "Useful for your current learning state"}
                  </small>
                </div>
                <div className="hero-actions">
                  <form action={async (formData) => {
                    "use server";
                    await addRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-primary" type="submit">Add</button>
                  </form>
                  <form action={async (formData) => {
                    "use server";
                    await dismissRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-secondary" type="submit">Dismiss</button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state compact-empty">
          <strong>No recommendations right now.</strong>
          <Link className="button button-secondary" href="/vocabulary">Back to vocabulary</Link>
        </section>
      )}
    </main>
  );
}
