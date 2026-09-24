import { AddLexemeForm } from "./AddLexemeForm";

export default function NewWord() {
  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">AI-ASSISTED ENTRY</p>
        <h1>Add vocabulary</h1>
        <p className="page-description">
          Add a German word, phrase, or grammatical pattern. OpenAI creates a
          structured lexical entry; Neon remains the source of truth.
        </p>
      </section>

      <AddLexemeForm />
    </main>
  );
}
