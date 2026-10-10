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
      <section className="page-header compact flex flex-col uv-padding-40251c0803 uv-vc442bc911a:max-w-uv-8b89fb679d uv-v3bccf64584:m-0 uv-v3bccf64584:uv-line-height-47e4b02db5 uv-v3bccf64584:uv-letter-spacing-5499e35ba4 uv-v3bccf64584:uv-weight-560 uv-min940:pt-8.5 uv-v3faa105aea:mb-1 gap-2 pt-4 uv-v3bccf64584:text-uv-fce2aeaeade">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">Personalized vocabulary</p>
        <h1>Recommendations</h1>
        <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">
          Deterministic retrieval finds useful candidates; optional low-cost AI only reranks that bounded set.
        </p>
      </section>

      {recommendations.length ? (
        <section className="vocabulary-list flex flex-col uv-border-top-8d7f82f403">
          {recommendations.map((item, index) => {
            const rationale =
              item.aiReasonCode
                ? reasonLabel(item.aiReasonCode) ?? ""
                : item.reasons[0]?.label ?? "";
            return (
              <article className="vocabulary-row uv-v4af6d61843:bg-uv-ccd6923c4a1 uv-min940:hover:bg-uv-surface relative min-h-19.5 grid uv-grid-template-columns-f06dd92ea5 uv-gap-e4accf4b2b uv-padding-9e55c755a1 uv-border-bottom-8d7f82f403 bg-transparent uv-va00727a60e:overflow-hidden uv-va00727a60e:text-uv-f2862aaf96f uv-va00727a60e:uv-line-height-8e007eaa50 uv-va00727a60e:uv-text-overflow-900198081b uv-va00727a60e:whitespace-nowrap uv-vc89072ee13:uv-grid-column-93b665dfb5 uv-vc89072ee13:h-0.75 uv-vc89072ee13:-mt-0.5 uv-min620:min-h-21 uv-min620:px-2" key={item.lexemeId}>
                <div className="vocabulary-row-main min-w-0">
                  <Link
                    className="word learning-content text-uv-f3951047c34 uv-weight-610 uv-letter-spacing-60c8585fce"
                    lang={targetLanguage.code}
                    dir="ltr"
                    href={"/vocabulary/" + item.lexemeId}
                  >
                    {item.article ? item.article + " " : ""}{item.lemma}
                  </Link>
                  <div className="translation-line flex flex-wrap uv-gap-4de81a03a8 text-uv-text-muted text-uv-f8bb1a95a21 min-w-0 mt-1 uv-v36c0309a03:block uv-v36c0309a03:overflow-hidden uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-f63777cce16 uv-v36c0309a03:uv-text-overflow-900198081b uv-v36c0309a03:whitespace-nowrap">
                    {item.english ? <span lang="en">{item.english}</span> : null}
                    {item.persian ? <span lang="fa" dir="rtl">{item.persian}</span> : null}
                  </div>
                  <small className="muted text-uv-text-muted">
                    {rationale || "Useful for your current learning state"}
                  </small>
                </div>
                <div className="hero-actions flex flex-col gap-2.5 uv-margin-66a0389558 uv-min620:flex-row uv-min620:items-center uv-min620:uv-vcded88c612:w-auto">
                  <form action={async (formData) => {
                    "use server";
                    await addRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit">Add</button>
                  </form>
                  <form action={async (formData) => {
                    "use server";
                    await dismissRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="submit">Dismiss</button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state compact-empty flex flex-col gap-3 items-start uv-border-c8a81946fb rounded-uv-r02a0a889dd text-uv-text-soft p-4.25">
          <strong>No recommendations right now.</strong>
          <Link className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" href="/vocabulary">Back to vocabulary</Link>
        </section>
      )}
    </main>
  );
}
