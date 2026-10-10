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
    <main className="page flex flex-col gap-4.5 uv-min620:gap-5.5 uv-min940:gap-6">
      <section className="page-header compact flex flex-col padding-24px-0-4px in-compact:max-w-uv-8b89fb679d in-h1:m-0 in-h1:line-height-0p96 in-h1:letter-spacing-0p055em in-h1:font-560 uv-min940:pt-8.5 in-compact-h1:mb-1 gap-2 pt-4 in-h1:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">Personalized vocabulary</p>
        <h1>Recommendations</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 line-height-1p65">
          Deterministic retrieval finds useful candidates; optional low-cost AI only reranks that bounded set.
        </p>
      </section>

      {recommendations.length ? (
        <section className="vocabulary-list flex flex-col border-1px-solid-border-3">
          {recommendations.map((item, index) => {
            const rationale =
              item.aiReasonCode
                ? reasonLabel(item.aiReasonCode) ?? ""
                : item.reasons[0]?.label ?? "";
            return (
              <article className="vocabulary-row in-nth-child-even:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative min-h-19.5 grid grid-template-columns-minmax-0-1fr-auto gap-8px-12px padding-12px-2px-13px border-1px-solid-border bg-transparent in-word:overflow-hidden in-word:text-uv-f2862aaf96f in-word:line-height-1p25 in-word:text-overflow-ellipsis in-word:whitespace-nowrap in-mastery-line:grid-column-1-1 in-mastery-line:h-0.75 in-mastery-line:-mt-0.5 uv-min620:min-h-21 uv-min620:px-2" key={item.lexemeId}>
                <div className="vocabulary-row-main min-w-0">
                  <Link
                    className="word learning-content text-uv-f3951047c34 font-610 letter-spacing-0p03em"
                    lang={targetLanguage.code}
                    dir="ltr"
                    href={"/vocabulary/" + item.lexemeId}
                  >
                    {item.article ? item.article + " " : ""}{item.lemma}
                  </Link>
                  <div className="translation-line flex flex-wrap gap-4px-10px text-uv-text-muted text-uv-f8bb1a95a21 min-w-0 mt-1 in-span:block in-span:overflow-hidden in-span:text-uv-text-muted in-span:text-uv-f63777cce16 in-span:text-overflow-ellipsis in-span:whitespace-nowrap">
                    {item.english ? <span lang="en">{item.english}</span> : null}
                    {item.persian ? <span lang="fa" dir="rtl">{item.persian}</span> : null}
                  </div>
                  <small className="muted text-uv-text-muted">
                    {rationale || "Useful for your current learning state"}
                  </small>
                </div>
                <div className="hero-actions flex flex-col gap-2.5 margin-6px-0-0 uv-min620:flex-row uv-min620:items-center uv-min620:in-button-2:w-auto">
                  <form action={async (formData) => {
                    "use server";
                    await addRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit">Add</button>
                  </form>
                  <form action={async (formData) => {
                    "use server";
                    await dismissRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="submit">Dismiss</button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state compact-empty flex flex-col gap-3 items-start border-1px-dashed-border-strong rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <strong>No recommendations right now.</strong>
          <Link className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" href="/vocabulary">Back to vocabulary</Link>
        </section>
      )}
    </main>
  );
}
