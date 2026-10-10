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
      <section className="grammar-lesson-lead max-width-78ch grid gap-2.5 padding-10px-2px-2px in-h2:m-0 in-h2:text-uv-f608539481c in-h2:letter-spacing-0p035em in-p:m-0 in-p:text-uv-text-soft in-p:text-uv-f19feeb881c in-p:line-height-1p75">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.complete")}</p>
        <h2>{t("grammar.lesson.understand")}</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition mt-1 p-4 border-3px-solid-primary bg-uv-surface rounded-uv-rcba3d40cc4 in-strong-2:block in-strong-2:mb-1.5 in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p68">
          <strong>{t("grammar.lesson.intuition")}</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column grid grid-template-columns-1fr gap-2.5 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
        <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.when")}</p>
          <h2>{t("grammar.lesson.triggers")}</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.recognize")}</p>
          <h2>{t("grammar.lesson.notice")}</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2 counter-reset-grammar-step in-ol:list-none in-ol:p-0 in-ol:grid in-ol:gap-2.5 in-li:counter-increment-grammar-step in-li:grid in-li:grid-template-columns-30px-minmax-0-1fr in-li:gap-2.5 in-li:items-start in-li-before:content-counter-grammar-step in-li-before:w-7 in-li-before:h-7 in-li-before:grid in-li-before:place-items-center in-li-before:border-1px-solid-border-2 in-li-before:rounded-uv-red9ab892c5 in-li-before:font-font-geist-mono-geist-mono-monospace in-li-before:text-uv-f58b84cc6f5 in-li-before:text-uv-text-muted">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.build")}</p>
        <h2>{t("grammar.lesson.steps")}</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables flex-col grid gap-2.5">
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.reference")}</p>
              <h2>{t("grammar.lesson.forms")}</h2>
            </div>
          </div>
          {lesson.tables.map((table) => (
            <div className="panel grammar-lesson-table-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c overflow-hidden in-h3:margin-0-0-10px in-h3:text-uv-f1a79c6a094" key={table.title}>
              <h3 dir="auto" className="learning-content">{table.title}</h3>
              <div className="grammar-table-scroll w-full overflow-x-auto in-table:w-full in-table:min-w-115 in-table:border-collapse in-table:text-uv-fe9d5fd6635 in-th:padding-9px-10px in-th:text-left in-th:border-1px-solid-border in-th:vertical-align-top in-td:padding-9px-10px in-td:text-left in-td:border-1px-solid-border in-td:vertical-align-top in-th:text-uv-text-muted in-th:text-uv-fe22288a701 in-th:uppercase in-th:letter-spacing-0p05em">
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

      <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.rulesDetail")}</p>
        <h2>{t("grammar.lesson.system")}</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section flex flex-col gap-3">
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.examples")}</p>
            <h2>{t("grammar.lesson.natural")}</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list grid grid-template-columns-1fr gap-2.25 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 in-strong:text-uv-f19feeb881c in-strong:line-height-1p5 in-p:m-0 in-small-2:m-0 in-p:text-uv-text-soft in-p:line-height-1p55 in-small-2:text-uv-text-muted in-small-2:line-height-1p45" key={index}>
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
          <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
            <div>
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.dontConfuse")}</p>
              <h2>{t("grammar.lesson.contrasts")}</h2>
            </div>
          </div>
          <div className="grammar-contrast-list grid grid-template-columns-1fr gap-2.25 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p55 in-h3:m-0 in-h3:text-uv-fee84419642 in-div:pt-2 in-div:border-1px-solid-border-3 in-div-strong:block in-div-strong:mb-1 in-div-strong:text-uv-f78eb7000a9 in-div-strong:text-uv-text-muted in-div-strong:uppercase in-div-strong:letter-spacing-0p05em" key={contrast.title}>
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
        <div className="section-heading flex items-center justify-between gap-3 in-h2:margin-5px-0-0 in-h2:text-uv-f24126b21bc in-h2:letter-spacing-0p025em mb-3 text-uv-text-soft">
          <div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.commonMistakes")}</p>
            <h2>{t("grammar.lesson.goesWrong")}</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples grid grid-template-columns-1fr gap-2.25 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-2 in-p-2:m-0 in-muted:text-uv-text-soft in-muted:line-height-1p55" key={index}>
              <p className="grammar-wrong line-height-1p5 in-span:inline-block in-span:min-w-9.5 in-span:mr-1.5 in-span:text-uv-text-muted in-span:text-uv-fe22288a701 in-span:uppercase in-span:letter-spacing-0p05em">
                <span>{t("grammar.lesson.not")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.wrong}
                </b>
              </p>
              <p className="grammar-correct line-height-1p5 in-span:inline-block in-span:min-w-9.5 in-span:mr-1.5 in-span:text-uv-text-muted in-span:text-uv-fe22288a701 in-span:uppercase in-span:letter-spacing-0p05em">
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
        <div className="grammar-lesson-two-column grid grid-template-columns-1fr gap-2.5 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.exceptions")}</p>
              <h2>{t("grammar.lesson.edgeCases")}</h2>
              <ul>
                {lesson.exceptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
              <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.usage")}</p>
              <h2>{t("grammar.lesson.germanUsage")}</h2>
              <ul>
                {lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column grid grid-template-columns-1fr gap-2.5 uv-min700:grid-template-columns-repeat-2-minmax-0-1fr">
        <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.useYourself")}</p>
          <h2>{t("grammar.lesson.speakingWriting")}</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-ol:m-0 in-ol:pl-5 in-ol:text-uv-text-soft in-ol:line-height-1p62 in-li-li:mt-2">
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.remember")}</p>
          <h2>{t("grammar.lesson.memory")}</h2>
          <ul>
            {lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet border-1px-solid-border-2 box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 rounded-uv-r6d27d54c6c grid gap-3 in-h2-2:m-0 in-h2-2:text-uv-f44eab8f17b in-p-2:m-0 in-p-2:text-uv-text-soft in-p-2:line-height-1p65 in-ul:m-0 in-ul:pl-5 in-ul:text-uv-text-soft in-ul:line-height-1p62 in-li-li:mt-2 border-uv-c62b7ee8a49 bg-uv-cbdfd7cd038">
        <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("grammar.lesson.cheat")}</p>
        <h2>{t("grammar.lesson.before")}</h2>
        <ul>
          {lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
