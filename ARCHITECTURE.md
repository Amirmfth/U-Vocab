# U-Vocab Architecture

## Providers
- **Neon Postgres** is the source of truth.
- **Prisma** owns relational persistence.
- **OpenAI** is the AI provider.

## Three engines
1. **Learner Model** — persistent knowledge dimensions and vocabulary state.
2. **Learning Engine** — deterministic selection, progression and later FSRS scheduling.
3. **AI Engine** — structured lexical analysis, generation and evaluation.

AI must not own canonical application state or review scheduling.

## Phase 1 modules
- `src/lib/db.ts`: database boundary.
- `src/lib/ai/*`: provider client and validated AI contracts.
- `src/app/vocabulary/*`: vocabulary library, detail and ingestion UI.
- `prisma/schema.prisma`: canonical lexical entities separated from per-user state.

## Lexical model
A `Lexeme` is reusable global lexical data. `UserVocabulary` represents a user's relationship with it. Translations, examples, patterns, and lexical relationships are normalized instead of stored as a single AI blob.

Both English and Persian meanings are first-class records. Persian content must be rendered RTL.

## Environment
Use Neon's pooled URL as `DATABASE_URL` and direct URL as `DIRECT_URL`. OpenAI uses `OPENAI_API_KEY`; `OPENAI_MODEL` can override the configured model.

## Next steps
Authentication/user preferences, full CRUD/editing, translation-mode UI, deterministic FSRS review, active-recall attempts, mistake memory, and session planning build on this foundation.


## Grammar curriculum and learner level

Grammar uses the same database-first boundary as vocabulary, but canonical grammar and personal grammar state remain separate:

- `GrammarConcept` is the versioned, curated German curriculum.
- prerequisite and related-concept records form an internal dependency model.
- `UserGrammarProgress` is user-specific and initially stores declared-level assumptions.
- `User.currentLevel` describes present ability; `User.targetLevel` describes the learning destination.

A concept may be introduced, expected and reinforced at different CEFR levels. CEFR placement is curriculum policy, not a claim that CEFR publishes a fixed grammar inventory.

AI may explain or generate material from canonical concepts, but cannot create canonical grammar state or directly assign mastery. Run `npm run db:seed-grammar` after the grammar migration to upsert curriculum data and synchronize existing declared-level assumptions. See `docs/grammar-curriculum.md`.
