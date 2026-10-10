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
      className="grammar-full-lesson grid gap-4.5"
      lang={language}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      <section className="grammar-lesson-lead uv-max-width-d44c4f9b87 grid gap-2.5 uv-padding-f6c4accfe1 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-f608539481c uv-vd552c26874:uv-letter-spacing-b22247dbaf uv-v026f084606:m-0 uv-v026f084606:text-uv-text-soft uv-v026f084606:text-uv-f19feeb881c uv-v026f084606:uv-line-height-86d76fc750">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.complete")}</p>
        <h2>{t("grammar.lesson.understand")}</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition mt-1 p-4 uv-border-left-4fceff48fe bg-uv-surface rounded-uv-rcba3d40cc4 uv-veda02a0adb:block uv-veda02a0adb:mb-1.5 uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-6faf2a5572">
          <strong>{t("grammar.lesson.intuition")}</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min700:uv-grid-template-columns-dd0b1a1848">
        <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.when")}</p>
          <h2>{t("grammar.lesson.triggers")}</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.recognize")}</p>
          <h2>{t("grammar.lesson.notice")}</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2 uv-counter-reset-952de50fb1 uv-v420f89edb5:list-none uv-v420f89edb5:p-0 uv-v420f89edb5:grid uv-v420f89edb5:gap-2.5 uv-vbc8f6c01a9:uv-counter-increment-952de50fb1 uv-vbc8f6c01a9:grid uv-vbc8f6c01a9:uv-grid-template-columns-51adf3fd32 uv-vbc8f6c01a9:gap-2.5 uv-vbc8f6c01a9:items-start uv-v44ee400460:uv-content-56fc2f6e69 uv-v44ee400460:w-7 uv-v44ee400460:h-7 uv-v44ee400460:grid uv-v44ee400460:uv-place-items-305047e96e uv-v44ee400460:uv-border-8d7f82f403 uv-v44ee400460:rounded-uv-red9ab892c5 uv-v44ee400460:uv-font-family-320794573f uv-v44ee400460:text-uv-f58b84cc6f5 uv-v44ee400460:text-uv-text-muted">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.build")}</p>
        <h2>{t("grammar.lesson.steps")}</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables flex-col grid gap-2.5">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.reference")}</p>
              <h2>{t("grammar.lesson.forms")}</h2>
            </div>
          </div>
          {lesson.tables.map((table) => (
            <div className="panel grammar-lesson-table-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c overflow-hidden uv-v55c53ce4b9:uv-margin-83bba30fc1 uv-v55c53ce4b9:text-uv-f1a79c6a094" key={table.title}>
              <h3 dir="auto" className="learning-content">{table.title}</h3>
              <div className="grammar-table-scroll w-full overflow-x-auto uv-v40b5778120:w-full uv-v40b5778120:min-w-115 uv-v40b5778120:uv-border-collapse-86d3bfb618 uv-v40b5778120:text-uv-fe9d5fd6635 uv-v91df30fa0b:uv-padding-e313bd0767 uv-v91df30fa0b:text-left uv-v91df30fa0b:uv-border-bottom-8d7f82f403 uv-v91df30fa0b:uv-vertical-align-af2c7b4ca0 uv-v96e4348bba:uv-padding-e313bd0767 uv-v96e4348bba:text-left uv-v96e4348bba:uv-border-bottom-8d7f82f403 uv-v96e4348bba:uv-vertical-align-af2c7b4ca0 uv-v91df30fa0b:text-uv-text-muted uv-v91df30fa0b:text-uv-fe22288a701 uv-v91df30fa0b:uppercase uv-v91df30fa0b:uv-letter-spacing-70fabcad9b">
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
              {table.note ? <p className="muted text-uv-text-muted">{table.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.rulesDetail")}</p>
        <h2>{t("grammar.lesson.system")}</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.examples")}</p>
            <h2>{t("grammar.lesson.natural")}</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list grid uv-grid-template-columns-6a5c4d4d49 gap-2.25 uv-min700:uv-grid-template-columns-dd0b1a1848">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 uv-ve6b262f465:text-uv-f19feeb881c uv-ve6b262f465:uv-line-height-aa8f289ebe uv-v026f084606:m-0 uv-v69dadb8fcd:m-0 uv-v026f084606:text-uv-text-soft uv-v026f084606:uv-line-height-05c248da4c uv-v69dadb8fcd:text-uv-text-muted uv-v69dadb8fcd:uv-line-height-2792cf2449" key={index}>
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
        <section className="page-section flex flex-col gap-3">
          <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.dontConfuse")}</p>
              <h2>{t("grammar.lesson.contrasts")}</h2>
            </div>
          </div>
          <div className="grammar-contrast-list grid uv-grid-template-columns-6a5c4d4d49 gap-2.25 uv-min700:uv-grid-template-columns-dd0b1a1848">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-05c248da4c uv-v55c53ce4b9:m-0 uv-v55c53ce4b9:text-uv-fee84419642 uv-vcbb57f4d35:pt-2 uv-vcbb57f4d35:uv-border-top-8d7f82f403 uv-v0ed2df88f3:block uv-v0ed2df88f3:mb-1 uv-v0ed2df88f3:text-uv-f78eb7000a9 uv-v0ed2df88f3:text-uv-text-muted uv-v0ed2df88f3:uppercase uv-v0ed2df88f3:uv-letter-spacing-70fabcad9b" key={contrast.title}>
                <h3>{contrast.title}</h3>
                <div>
                  <strong>{t("grammar.lesson.thisConcept")}</strong>
                  <p dir="auto" className="learning-content">{contrast.thisConcept}</p>
                </div>
                <div>
                  <strong>{t("grammar.lesson.otherForm")}</strong>
                  <p dir="auto" className="learning-content">{contrast.otherForm}</p>
                </div>
                <p className="muted text-uv-text-muted">{contrast.difference}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 uv-vd552c26874:uv-margin-2efa7d29f3 uv-vd552c26874:text-uv-f24126b21bc uv-vd552c26874:uv-letter-spacing-8b899f0f19 mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.commonMistakes")}</p>
            <h2>{t("grammar.lesson.goesWrong")}</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples grid uv-grid-template-columns-6a5c4d4d49 gap-2.25 uv-min700:uv-grid-template-columns-dd0b1a1848">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 uv-vb19eb067c9:m-0 uv-vf122c6d218:text-uv-text-soft uv-vf122c6d218:uv-line-height-05c248da4c" key={index}>
              <p className="grammar-wrong uv-line-height-aa8f289ebe uv-v36c0309a03:inline-block uv-v36c0309a03:min-w-9.5 uv-v36c0309a03:mr-1.5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-fe22288a701 uv-v36c0309a03:uppercase uv-v36c0309a03:uv-letter-spacing-70fabcad9b">
                <span>{t("grammar.lesson.not")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.wrong}
                </b>
              </p>
              <p className="grammar-correct uv-line-height-aa8f289ebe uv-v36c0309a03:inline-block uv-v36c0309a03:min-w-9.5 uv-v36c0309a03:mr-1.5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-fe22288a701 uv-v36c0309a03:uppercase uv-v36c0309a03:uv-letter-spacing-70fabcad9b">
                <span>{t("grammar.lesson.use")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.correct}
                </b>
              </p>
              <p className="muted text-uv-text-muted">{mistake.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {lesson.exceptions.length || lesson.usageNotes.length ? (
        <div className="grammar-lesson-two-column grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min700:uv-grid-template-columns-dd0b1a1848">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.exceptions")}</p>
              <h2>{t("grammar.lesson.edgeCases")}</h2>
              <ul>
                {lesson.exceptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
              <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.usage")}</p>
              <h2>{t("grammar.lesson.germanUsage")}</h2>
              <ul>
                {lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column grid uv-grid-template-columns-6a5c4d4d49 gap-2.5 uv-min700:uv-grid-template-columns-dd0b1a1848">
        <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.useYourself")}</p>
          <h2>{t("grammar.lesson.speakingWriting")}</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-v420f89edb5:m-0 uv-v420f89edb5:pl-5 uv-v420f89edb5:text-uv-text-soft uv-v420f89edb5:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.remember")}</p>
          <h2>{t("grammar.lesson.memory")}</h2>
          <ul>
            {lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet uv-border-8d7f82f403 uv-box-shadow-2853ca6bd8 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 uv-v8fa571edc2:m-0 uv-v8fa571edc2:text-uv-f44eab8f17b uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-cf9a155f4a uv-v10010674ad:m-0 uv-v10010674ad:pl-5 uv-v10010674ad:text-uv-text-soft uv-v10010674ad:uv-line-height-daa388cc8c uv-vfe836888b7:mt-2 border-uv-c62b7ee8a49 bg-uv-cbdfd7cd038">
        <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("grammar.lesson.cheat")}</p>
        <h2>{t("grammar.lesson.before")}</h2>
        <ul>
          {lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
