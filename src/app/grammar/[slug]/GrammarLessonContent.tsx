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
      className="grammar-full-lesson"
      lang={language}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      <section className="grammar-lesson-lead">
        <p className="eyebrow">{t("grammar.lesson.complete")}</p>
        <h2>{t("grammar.lesson.understand")}</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition">
          <strong>{t("grammar.lesson.intuition")}</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{t("grammar.lesson.when")}</p>
          <h2>{t("grammar.lesson.triggers")}</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{t("grammar.lesson.recognize")}</p>
          <h2>{t("grammar.lesson.notice")}</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps">
        <p className="eyebrow">{t("grammar.lesson.build")}</p>
        <h2>{t("grammar.lesson.steps")}</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.lesson.reference")}</p>
              <h2>{t("grammar.lesson.forms")}</h2>
            </div>
          </div>
          {lesson.tables.map((table) => (
            <div className="panel grammar-lesson-table-card" key={table.title}>
              <h3 dir="auto" className="learning-content">{table.title}</h3>
              <div className="grammar-table-scroll">
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
              {table.note ? <p className="muted">{table.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="panel grammar-lesson-section">
        <p className="eyebrow">{t("grammar.lesson.rulesDetail")}</p>
        <h2>{t("grammar.lesson.system")}</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("grammar.lesson.examples")}</p>
            <h2>{t("grammar.lesson.natural")}</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example" key={index}>
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
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("grammar.lesson.dontConfuse")}</p>
              <h2>{t("grammar.lesson.contrasts")}</h2>
            </div>
          </div>
          <div className="grammar-contrast-list">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card" key={contrast.title}>
                <h3>{contrast.title}</h3>
                <div>
                  <strong>{t("grammar.lesson.thisConcept")}</strong>
                  <p dir="auto" className="learning-content">{contrast.thisConcept}</p>
                </div>
                <div>
                  <strong>{t("grammar.lesson.otherForm")}</strong>
                  <p dir="auto" className="learning-content">{contrast.otherForm}</p>
                </div>
                <p className="muted">{contrast.difference}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("grammar.lesson.commonMistakes")}</p>
            <h2>{t("grammar.lesson.goesWrong")}</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example" key={index}>
              <p className="grammar-wrong">
                <span>{t("grammar.lesson.not")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.wrong}
                </b>
              </p>
              <p className="grammar-correct">
                <span>{t("grammar.lesson.use")}</span>{" "}
                <b className="learning-content" lang={targetLanguageCode} dir="ltr">
                  {mistake.correct}
                </b>
              </p>
              <p className="muted">{mistake.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {lesson.exceptions.length || lesson.usageNotes.length ? (
        <div className="grammar-lesson-two-column">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">{t("grammar.lesson.exceptions")}</p>
              <h2>{t("grammar.lesson.edgeCases")}</h2>
              <ul>
                {lesson.exceptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">{t("grammar.lesson.usage")}</p>
              <h2>{t("grammar.lesson.germanUsage")}</h2>
              <ul>
                {lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{t("grammar.lesson.useYourself")}</p>
          <h2>{t("grammar.lesson.speakingWriting")}</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{t("grammar.lesson.remember")}</p>
          <h2>{t("grammar.lesson.memory")}</h2>
          <ul>
            {lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet">
        <p className="eyebrow">{t("grammar.lesson.cheat")}</p>
        <h2>{t("grammar.lesson.before")}</h2>
        <ul>
          {lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
