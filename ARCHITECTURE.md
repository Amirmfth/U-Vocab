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


## Grammar intelligence architecture

Grammar extends the three-engine architecture without creating a parallel flashcard system.

### Canonical layer

`GrammarConcept` plus prerequisites/relations is the curated, versioned curriculum. Stable canonical IDs are shared by Grammar lessons, lexical links, Practice, Writing, Reading, mistakes and recommendations.

### Learner layer

`UserGrammarProgress` stores the current profile across understanding, controlled production and free production. Declared-level initialization creates assumptions rather than mastery.

`GrammarEvidence` is the append-only evidence stream. Deterministic learner policy, not AI output, converts accepted SUCCESS/ERROR evidence into profile dimensions and statuses. `GrammarProgressTransition` records meaningful status changes for observability.

### Learning surfaces

- **Grammar** teaches canonical concepts and exposes related personal vocabulary.
- **Practice** supports vocabulary-only, grammar-only and bounded recommended mixed sessions.
- **Writing** emits validated ERROR/SUCCESS/OPPORTUNITY observations. Only high-confidence canonical observations enter the learner model.
- **Reading** generates natural personalized German and stores structured grammar coverage. Exposure alone is not mastery; explicit grammar comprehension questions may add modest understanding evidence.
- **Mistakes** groups recurring grammar weakness by canonical concept.
- **Focus** can use one explainable grammar recommendation as a session activity.
- **Review** remains vocabulary-first and FSRS-driven.

### Recommendation layer

`getGrammarRecommendation` is deterministic and explainable. Priority is:

1. recurring unresolved weakness / NEEDS_ATTENTION
2. continue LEARNING
3. prerequisite gaps
4. a non-overexposed next concept between current and target CEFR

STRONG concepts are excluded unless future evidence first changes their profile. Personal vocabulary links and recent evidence affect next-concept selection. No black-box recommendation model is required.

Recommendation clicks store only concept ID, surface, reason code and action in `GrammarRecommendationEvent`; free-form learner text is not copied into recommendation telemetry.

### Intentional exclusions

- no grammar FSRS deck
- no AI-owned curriculum
- no AI-owned mastery
- no user-facing Grammar Universe/graph
- no paste-and-scan Reading as the primary Reading product
