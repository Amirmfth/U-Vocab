import type { GrammarLessonResult } from "@/lib/ai/grammar-lesson";

export function GrammarLessonContent({
  lesson,
}: {
  lesson: GrammarLessonResult;
}) {
  return (
    <div className="grammar-full-lesson">
      <section className="grammar-lesson-lead">
        <p className="eyebrow">COMPLETE LESSON</p>
        <h2>Understand the idea first</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition">
          <strong>The intuition</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">WHEN TO USE IT</p>
          <h2>What triggers this grammar</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">RECOGNIZE IT</p>
          <h2>What to notice</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps">
        <p className="eyebrow">BUILD IT</p>
        <h2>Step by step</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables">
          <div className="section-heading">
            <div>
              <p className="eyebrow">REFERENCE</p>
              <h2>Forms and patterns</h2>
            </div>
          </div>
          {lesson.tables.map((table) => (
            <div className="panel grammar-lesson-table-card" key={table.title}>
              <h3>{table.title}</h3>
              <div className="grammar-table-scroll">
                <table>
                  <thead>
                    <tr>
                      {table.headers.map((header) => <th key={header}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
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
        <p className="eyebrow">RULES IN DETAIL</p>
        <h2>How the system works</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXAMPLES</p>
            <h2>From simple to natural use</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example" key={index}>
              <strong lang="de">{example.german}</strong>
              <p>{example.english}</p>
              <small>{example.note}</small>
            </article>
          ))}
        </div>
      </section>

      {lesson.contrasts.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DON’T CONFUSE IT WITH…</p>
              <h2>Useful contrasts</h2>
            </div>
          </div>
          <div className="grammar-contrast-list">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card" key={contrast.title}>
                <h3>{contrast.title}</h3>
                <div><strong>This concept</strong><p>{contrast.thisConcept}</p></div>
                <div><strong>Other form</strong><p>{contrast.otherForm}</p></div>
                <p className="muted">{contrast.difference}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COMMON MISTAKES</p>
            <h2>What usually goes wrong</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example" key={index}>
              <p className="grammar-wrong"><span>Not:</span> {mistake.wrong}</p>
              <p className="grammar-correct"><span>Use:</span> {mistake.correct}</p>
              <p className="muted">{mistake.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {(lesson.exceptions.length || lesson.usageNotes.length) ? (
        <div className="grammar-lesson-two-column">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">EXCEPTIONS</p>
              <h2>Important edge cases</h2>
              <ul>{lesson.exceptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">USAGE</p>
              <h2>How Germans actually use it</h2>
              <ul>{lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">USE IT YOURSELF</p>
          <h2>Speaking & writing</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">REMEMBER IT</p>
          <h2>Memory shortcuts</h2>
          <ul>{lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet">
        <p className="eyebrow">CHEAT SHEET</p>
        <h2>Before you speak or write</h2>
        <ul>{lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
