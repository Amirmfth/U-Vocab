import type { GrammarLessonResult } from "@/lib/ai/grammar-lesson";
import { createTranslator } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";

export function GrammarLessonContent({
  lesson,
  language,
  uiLocale,
  targetLanguageCode,
}: {
  lesson: GrammarLessonResult;
  language: "en" | "fa";
  uiLocale: UiLocale;
  targetLanguageCode: string;
}) {
  const t = createTranslator(uiLocale);

  return (
    <div
      className="grammar-full-lesson [display:grid] [gap:18px]"
      lang={language}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      <section className="grammar-lesson-lead [max-width:78ch] [display:grid] [gap:10px] [padding:10px_2px_2px] [&_h2]:[margin:0] [&_h2]:[font-size:clamp(1.55rem,_5vw,_2.25rem)] [&_h2]:[letter-spacing:-0.035em] [&_>_p]:[margin:0] [&_>_p]:[color:var(--text-soft)] [&_>_p]:[font-size:1rem] [&_>_p]:[line-height:1.75]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.complete")}</p>
        <h2>{t("grammar.lesson.understand")}</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition [margin-top:4px] [padding:16px] [border-left:3px_solid_var(--primary)] [background:var(--surface)] [border-radius:0_14px_14px_0] [&_strong]:[display:block] [&_strong]:[margin-bottom:6px] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.68]">
          <strong>{t("grammar.lesson.intuition")}</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column [display:grid] [grid-template-columns:1fr] [gap:10px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
        <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.when")}</p>
          <h2>{t("grammar.lesson.triggers")}</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.recognize")}</p>
          <h2>{t("grammar.lesson.notice")}</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px] [counter-reset:grammar-step] [&_ol]:[list-style:none] [&_ol]:[padding:0] [&_ol]:[display:grid] [&_ol]:[gap:10px] [&_li]:[counter-increment:grammar-step] [&_li]:[display:grid] [&_li]:[grid-template-columns:30px_minmax(0,_1fr)] [&_li]:[gap:10px] [&_li]:[align-items:start] [&_li::before]:[content:counter(grammar-step)] [&_li::before]:[width:28px] [&_li::before]:[height:28px] [&_li::before]:[display:grid] [&_li::before]:[place-items:center] [&_li::before]:[border:1px_solid_var(--border)] [&_li::before]:[border-radius:999px] [&_li::before]:[font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [&_li::before]:[font-size:0.7rem] [&_li::before]:[color:var(--text-muted)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.build")}</p>
        <h2>{t("grammar.lesson.steps")}</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables [flex-direction:column] [display:grid] [gap:10px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.reference")}</p>
              <h2>{t("grammar.lesson.forms")}</h2>
            </div>
          </div>
          {lesson.tables.map((table) => (
            <div className="panel grammar-lesson-table-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [overflow:hidden] [&_h3]:[margin:0_0_10px] [&_h3]:[font-size:0.92rem]" key={table.title}>
              <h3 dir="auto" className="learning-content">{table.title}</h3>
              <div className="grammar-table-scroll [width:100%] [overflow-x:auto] [&_table]:[width:100%] [&_table]:[min-width:460px] [&_table]:[border-collapse:collapse] [&_table]:[font-size:0.78rem] [&_th]:[padding:9px_10px] [&_th]:[text-align:left] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:[vertical-align:top] [&_td]:[padding:9px_10px] [&_td]:[text-align:left] [&_td]:[border-bottom:1px_solid_var(--border)] [&_td]:[vertical-align:top] [&_th]:[color:var(--text-muted)] [&_th]:[font-size:0.67rem] [&_th]:[text-transform:uppercase] [&_th]:[letter-spacing:0.05em]">
                <table>
                  <thead>
                    <tr>
                      {table.headers.map((header) => (
                        <th key={header} dir="auto" className="learning-content">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} dir="auto" className="learning-content">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note ? <p className="muted [color:var(--text-muted)]">{table.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.rulesDetail")}</p>
        <h2>{t("grammar.lesson.system")}</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.examples")}</p>
            <h2>{t("grammar.lesson.natural")}</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list [display:grid] [grid-template-columns:1fr] [gap:9px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:8px] [&_>_strong]:[font-size:1rem] [&_>_strong]:[line-height:1.5] [&_>_p]:[margin:0] [&_>_small]:[margin:0] [&_>_p]:[color:var(--text-soft)] [&_>_p]:[line-height:1.55] [&_>_small]:[color:var(--text-muted)] [&_>_small]:[line-height:1.45]" key={index}>
              <strong className="learning-content" lang={targetLanguageCode} dir="ltr">
                {example.targetText}
              </strong>
              <p>{example.translation}</p>
              <small>{example.note}</small>
            </article>
          ))}
        </div>
      </section>

      {lesson.contrasts.length ? (
        <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
          <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
            <div>
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.dontConfuse")}</p>
              <h2>{t("grammar.lesson.contrasts")}</h2>
            </div>
          </div>
          <div className="grammar-contrast-list [display:grid] [grid-template-columns:1fr] [gap:9px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:8px] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.55] [&_h3]:[margin:0] [&_h3]:[font-size:0.9rem] [&_>_div]:[padding-top:8px] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div_>_strong]:[display:block] [&_>_div_>_strong]:[margin-bottom:4px] [&_>_div_>_strong]:[font-size:0.68rem] [&_>_div_>_strong]:[color:var(--text-muted)] [&_>_div_>_strong]:[text-transform:uppercase] [&_>_div_>_strong]:[letter-spacing:0.05em]" key={contrast.title}>
                <h3>{contrast.title}</h3>
                <div>
                  <strong>{t("grammar.lesson.thisConcept")}</strong>
                  <p dir="auto" className="learning-content">{contrast.thisConcept}</p>
                </div>
                <div>
                  <strong>{t("grammar.lesson.otherForm")}</strong>
                  <p dir="auto" className="learning-content">{contrast.otherForm}</p>
                </div>
                <p className="muted [color:var(--text-muted)]">{contrast.difference}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section [display:flex] [flex-direction:column] [gap:12px]">
        <div className="section-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [&_h2]:[margin:5px_0_0] [&_h2]:[font-size:1.1rem] [&_h2]:[letter-spacing:-0.025em] [margin-bottom:12px] [color:var(--text-soft)]">
          <div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.commonMistakes")}</p>
            <h2>{t("grammar.lesson.goesWrong")}</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples [display:grid] [grid-template-columns:1fr] [gap:9px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:8px] [&_p]:[margin:0] [&_.muted]:[color:var(--text-soft)] [&_.muted]:[line-height:1.55]" key={index}>
              <p className="grammar-wrong [line-height:1.5] [&_span]:[display:inline-block] [&_span]:[min-width:38px] [&_span]:[margin-right:6px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.67rem] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.05em]">
                <span>{t("grammar.lesson.not")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.wrong}
                </b>
              </p>
              <p className="grammar-correct [line-height:1.5] [&_span]:[display:inline-block] [&_span]:[min-width:38px] [&_span]:[margin-right:6px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:0.67rem] [&_span]:[text-transform:uppercase] [&_span]:[letter-spacing:0.05em]">
                <span>{t("grammar.lesson.use")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.correct}
                </b>
              </p>
              <p className="muted [color:var(--text-muted)]">{mistake.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {lesson.exceptions.length || lesson.usageNotes.length ? (
        <div className="grammar-lesson-two-column [display:grid] [grid-template-columns:1fr] [gap:10px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.exceptions")}</p>
              <h2>{t("grammar.lesson.edgeCases")}</h2>
              <ul>
                {lesson.exceptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
              <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.usage")}</p>
              <h2>{t("grammar.lesson.germanUsage")}</h2>
              <ul>
                {lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column [display:grid] [grid-template-columns:1fr] [gap:10px] min-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">
        <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.useYourself")}</p>
          <h2>{t("grammar.lesson.speakingWriting")}</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_ol]:[margin:0] [&_ol]:[padding-left:20px] [&_ol]:[color:var(--text-soft)] [&_ol]:[line-height:1.62] [&_li_+_li]:[margin-top:8px]">
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.remember")}</p>
          <h2>{t("grammar.lesson.memory")}</h2>
          <ul>
            {lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet [border:1px_solid_var(--border)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [border-radius:18px] [display:grid] [gap:12px] [&_>_h2]:[margin:0] [&_>_h2]:[font-size:1.08rem] [&_p]:[margin:0] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.65] [&_ul]:[margin:0] [&_ul]:[padding-left:20px] [&_ul]:[color:var(--text-soft)] [&_ul]:[line-height:1.62] [&_li_+_li]:[margin-top:8px] [border-color:rgba(139,_124,_255,_0.32)] [background:var(--primary-soft)]">
        <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("grammar.lesson.cheat")}</p>
        <h2>{t("grammar.lesson.before")}</h2>
        <ul>
          {lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
