import type { GrammarLessonResult } from "@/lib/ai/grammar-lesson";

const persianLabels: Record<string, string> = {
  "COMPLETE LESSON": "درس کامل",
  "Understand the idea first": "اول مفهوم را درک کنید",
  "The intuition": "درک شهودی",
  "WHEN TO USE IT": "زمان استفاده",
  "What triggers this grammar": "چه زمانی از این ساختار استفاده کنیم",
  "RECOGNIZE IT": "شناسایی ساختار",
  "What to notice": "به چه چیزهایی توجه کنیم",
  "BUILD IT": "ساختار جمله",
  "Step by step": "گام به گام",
  REFERENCE: "مرجع",
  "Forms and patterns": "شکل‌ها و الگوها",
  "RULES IN DETAIL": "قواعد با جزئیات",
  "How the system works": "این ساختار چگونه کار می‌کند",
  EXAMPLES: "مثال‌ها",
  "From simple to natural use": "از مثال ساده تا کاربرد طبیعی",
  "Useful contrasts": "تفاوت‌های مهم",
  "This concept": "این مفهوم",
  "Other form": "ساختار دیگر",
  "COMMON MISTAKES": "اشتباهات رایج",
  "What usually goes wrong": "اشتباهات معمول",
  "Not:": "نادرست:",
  "Use:": "درست:",
  EXCEPTIONS: "استثناها",
  "Important edge cases": "موارد استثنایی مهم",
  USAGE: "کاربرد",
  "How Germans actually use it": "کاربرد طبیعی در آلمانی",
  "USE IT YOURSELF": "خودتان استفاده کنید",
  "Speaking & writing": "گفتار و نوشتار",
  "REMEMBER IT": "به خاطر بسپارید",
  "Memory shortcuts": "نکته‌های یادآوری",
  "CHEAT SHEET": "خلاصهٔ سریع",
  "Before you speak or write": "پیش از گفتن یا نوشتن",
};

export function GrammarLessonContent({
  lesson,
  language,
}: {
  lesson: GrammarLessonResult;
  language: "en" | "fa";
}) {
  const label = (english: string) => language === "fa" ? persianLabels[english] ?? english : english;
  return (
    <div className="grammar-full-lesson" lang={language} dir={language === "fa" ? "rtl" : "ltr"}>
      <section className="grammar-lesson-lead">
        <p className="eyebrow">{label("COMPLETE LESSON")}</p>
        <h2>{label("Understand the idea first")}</h2>
        <p>{lesson.overview}</p>
        <div className="grammar-lesson-intuition">
          <strong>{label("The intuition")}</strong>
          <p>{lesson.intuition}</p>
        </div>
      </section>

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{label("WHEN TO USE IT")}</p>
          <h2>{label("What triggers this grammar")}</h2>
          <ul>
            {lesson.whenToUse.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{label("RECOGNIZE IT")}</p>
          <h2>{label("What to notice")}</h2>
          <ul>
            {lesson.recognitionCues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="panel grammar-lesson-section grammar-lesson-steps">
        <p className="eyebrow">{label("BUILD IT")}</p>
        <h2>{label("Step by step")}</h2>
        <ol>
          {lesson.formation.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {lesson.tables.length ? (
        <section className="page-section grammar-lesson-tables">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{label("REFERENCE")}</p>
              <h2>{label("Forms and patterns")}</h2>
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
        <p className="eyebrow">{label("RULES IN DETAIL")}</p>
        <h2>{label("How the system works")}</h2>
        <ol>
          {lesson.ruleDetails.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{label("EXAMPLES")}</p>
            <h2>{label("From simple to natural use")}</h2>
          </div>
        </div>
        <div className="grammar-rich-example-list">
          {lesson.examples.map((example, index) => (
            <article className="panel grammar-rich-example" key={index}>
              <strong lang="de">{example.german}</strong>
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
              <p className="eyebrow">DON’T CONFUSE IT WITH…</p>
              <h2>{label("Useful contrasts")}</h2>
            </div>
          </div>
          <div className="grammar-contrast-list">
            {lesson.contrasts.map((contrast) => (
              <article className="panel grammar-contrast-card" key={contrast.title}>
                <h3>{contrast.title}</h3>
                <div><strong>{label("This concept")}</strong><p>{contrast.thisConcept}</p></div>
                <div><strong>{label("Other form")}</strong><p>{contrast.otherForm}</p></div>
                <p className="muted">{contrast.difference}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{label("COMMON MISTAKES")}</p>
            <h2>{label("What usually goes wrong")}</h2>
          </div>
        </div>
        <div className="grammar-mistake-examples">
          {lesson.commonMistakes.map((mistake, index) => (
            <article className="panel grammar-mistake-example" key={index}>
              <p className="grammar-wrong"><span>{label("Not:")}</span> {mistake.wrong}</p>
              <p className="grammar-correct"><span>{label("Use:")}</span> {mistake.correct}</p>
              <p className="muted">{mistake.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {(lesson.exceptions.length || lesson.usageNotes.length) ? (
        <div className="grammar-lesson-two-column">
          {lesson.exceptions.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">{label("EXCEPTIONS")}</p>
              <h2>{label("Important edge cases")}</h2>
              <ul>{lesson.exceptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
          {lesson.usageNotes.length ? (
            <section className="panel grammar-lesson-section">
              <p className="eyebrow">{label("USAGE")}</p>
              <h2>{label("How Germans actually use it")}</h2>
              <ul>{lesson.usageNotes.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grammar-lesson-two-column">
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{label("USE IT YOURSELF")}</p>
          <h2>{label("Speaking & writing")}</h2>
          <ul>
            {lesson.speakingWritingTips.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="panel grammar-lesson-section">
          <p className="eyebrow">{label("REMEMBER IT")}</p>
          <h2>{label("Memory shortcuts")}</h2>
          <ul>{lesson.memoryAids.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <section className="panel grammar-cheat-sheet">
        <p className="eyebrow">{label("CHEAT SHEET")}</p>
        <h2>{label("Before you speak or write")}</h2>
        <ul>{lesson.cheatSheet.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
