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
    <main className="page [display:flex] [flex-direction:column] [gap:18px] min-[620px]:[gap:22px] min-[940px]:[gap:24px]">
      <section className="page-header compact [display:flex] [flex-direction:column] [padding:24px_0_4px] [&.compact]:[max-width:720px] [&_h1]:[margin:0] [&_h1]:[line-height:0.96] [&_h1]:[letter-spacing:-0.055em] [&_h1]:[font-weight:560] min-[940px]:[padding-top:34px] [&.compact_h1]:[margin-bottom:4px] [gap:8px] [padding-top:16px] [&_h1]:[font-size:clamp(2rem,_9vw,_4.5rem)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">Personalized vocabulary</p>
        <h1>Recommendations</h1>
        <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">
          Deterministic retrieval finds useful candidates; optional low-cost AI only reranks that bounded set.
        </p>
      </section>

      {recommendations.length ? (
        <section className="vocabulary-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
          {recommendations.map((item, index) => {
            const rationale =
              item.aiReasonCode
                ? reasonLabel(item.aiReasonCode) ?? ""
                : item.reasons[0]?.label ?? "";
            return (
              <article className="vocabulary-row [&:nth-child(even)]:[background:rgb(22,_22,_22)] min-[940px]:[&:hover]:[background:var(--surface)] [position:relative] [min-height:78px] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [gap:8px_12px] [padding:12px_2px_13px] [border-bottom:1px_solid_var(--border)] [background:transparent] [&_.word]:[overflow:hidden] [&_.word]:[font-size:1.04rem] [&_.word]:[line-height:1.25] [&_.word]:[text-overflow:ellipsis] [&_.word]:[white-space:nowrap] [&_.mastery-line]:[grid-column:1_/_-1] [&_.mastery-line]:[height:3px] [&_.mastery-line]:[margin-top:-2px] min-[620px]:[min-height:84px] min-[620px]:[padding-inline:8px]" key={item.lexemeId}>
                <div className="vocabulary-row-main [min-width:0]">
                  <Link
                    className="word learning-content [font-size:1.35rem] [font-weight:610] [letter-spacing:-0.03em]"
                    lang={targetLanguage.code}
                    dir="ltr"
                    href={"/vocabulary/" + item.lexemeId}
                  >
                    {item.article ? item.article + " " : ""}{item.lemma}
                  </Link>
                  <div className="translation-line [display:flex] [flex-wrap:wrap] [gap:4px_10px] [color:var(--text-muted)] [font-size:0.84rem] [min-width:0] [margin-top:4px] [&_span]:[display:block] [&_span]:[overflow:hidden] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.74rem] [&_span]:[text-overflow:ellipsis] [&_span]:[white-space:nowrap]">
                    {item.english ? <span lang="en">{item.english}</span> : null}
                    {item.persian ? <span lang="fa" dir="rtl">{item.persian}</span> : null}
                  </div>
                  <small className="muted [color:var(--text-muted)]">
                    {rationale || "Useful for your current learning state"}
                  </small>
                </div>
                <div className="hero-actions [display:flex] [flex-direction:column] [gap:10px] [margin:6px_0_0] min-[620px]:[flex-direction:row] min-[620px]:[align-items:center] min-[620px]:[&_.button]:[width:auto]">
                  <form action={async (formData) => {
                    "use server";
                    await addRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit">Add</button>
                  </form>
                  <form action={async (formData) => {
                    "use server";
                    await dismissRecommendation({ status: "idle" }, formData);
                  }}>
                    <input type="hidden" name="lexemeId" value={item.lexemeId} />
                    <input type="hidden" name="rationale" value={rationale} />
                    <input type="hidden" name="aiReasonCode" value={item.aiReasonCode ?? ""} />
                    <input type="hidden" name="position" value={index + 1} />
                    <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="submit">Dismiss</button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state compact-empty [display:flex] [flex-direction:column] [gap:12px] [align-items:flex-start] [border:1px_dashed_var(--border-strong)] [border-radius:var(--radius-lg)] [color:var(--text-soft)] [padding:17px]">
          <strong>No recommendations right now.</strong>
          <Link className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" href="/vocabulary">Back to vocabulary</Link>
        </section>
      )}
    </main>
  );
}
