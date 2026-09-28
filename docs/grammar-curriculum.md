# German Grammar Curriculum

U-Vocab treats grammar as a **curated curriculum plus a per-user knowledge profile**. It is not a dynamically generated list of AI lessons and it is not a second vocabulary deck.

## Curriculum ownership

The canonical German curriculum lives in `src/lib/grammar/curriculum.ts` and is persisted through:

```bash
npm run db:seed-grammar
```

Canonical records use stable IDs such as `de.case.dative`. Downstream features must reference those IDs rather than creating new concepts at runtime.

The initial curriculum covers A1–B2 and is deliberately extensible to C1/C2.

## What CEFR metadata means

CEFR itself is a proficiency framework rather than an official one-to-one grammar syllabus. U-Vocab therefore treats level placement as **curriculum policy**, informed by common German-as-a-foreign-language progression and CEFR-aligned course/exam expectations.

Each grammar concept can distinguish:

- `introducedAt`: a reasonable first exposure
- `expectedBy`: the level by which working knowledge is expected
- `reinforcedAt`: later levels where the same concept should become deeper or more productive

This prevents duplicate concepts such as independent "A2 subordinate clauses" and "B1 subordinate clauses." The canonical concept remains stable while its depth changes over time.

## Curriculum structure

A concept may have:

- category
- stable ID and slug
- short description
- CEFR introduction/expectation/reinforcement metadata
- parent/subconcept relationship
- prerequisites
- related/contrasting concepts
- rules, exceptions and curated examples
- version and active/deprecated state

The prerequisite graph is internal learning infrastructure. It is **not** a requirement for a user-facing Grammar Universe.

## Validation and governance

`validateGrammarCurriculum` rejects:

- duplicate IDs
- duplicate slugs
- invalid references
- self-references
- CEFR expectation/reinforcement earlier than introduction
- prerequisite cycles

The seed command is idempotent:

1. upsert canonical concepts by stable ID
2. deactivate German concepts removed from the current curriculum instead of recycling IDs
3. rebuild curriculum-owned prerequisite/related links
4. synchronize declared-level grammar assumptions for existing users

When changing the curriculum:

1. keep an existing ID when wording/content changes but the pedagogical concept is still the same
2. introduce a new ID when the concept's meaning materially changes
3. deprecate instead of reusing removed IDs
4. add prerequisites only when they are genuinely needed for comprehension
5. run curriculum tests before seeding

## AI boundary

AI may:

- explain a canonical concept
- generate personalized examples
- generate exercises
- classify an observed mistake against an allowlisted canonical concept

AI must not:

- create canonical grammar concepts at runtime
- change CEFR placement
- change prerequisites
- directly declare learner mastery

Canonical curriculum state remains deterministic application data.

## Current level vs. target level

Users have two different CEFR properties:

- `currentLevel`: present self-assessed ability and the baseline for content difficulty
- `targetLevel`: the learning destination

A learner declaring B1 does not have to complete A1/A2 grammar from zero. Concepts expected before B1 may be initialized as `ASSUMED`, never `STRONG` or mastered.

Assumed knowledge is explicitly marked with `DECLARED_LEVEL` provenance. When the user changes their current level, U-Vocab deletes/recreates only those declared-level assumptions. Future evidence-backed or manually set progress must remain untouched.

A1 is the default for new users. The migration that introduces this model initializes pre-existing U-Vocab users at B1 before switching the default to A1, preserving the application's existing learner.

## What comes next

Issue #79 adds evidence-based grammar knowledge dimensions and deterministic state transitions. That layer should build on `UserGrammarProgress` rather than changing the canonical curriculum.

Grammar does not require FSRS scheduling. Vocabulary Review remains a separate retention mechanism.


## Evidence-based personal grammar profile

Grammar knowledge is refined through `GrammarEvidence` events rather than direct score mutations.

Each event records:

- canonical grammar concept
- source (Practice, Writing, Reading comprehension, Conversation, or manual/system input)
- outcome (success, error, opportunity, encounter)
- learning dimension (understanding, controlled production, free production)
- strength and confidence
- effective deterministic weight
- accepted/rejected state
- a caller-supplied idempotency key
- optional source reference, short excerpt, and metadata

Low-confidence observations are retained for audit but do not change mastery. Opportunities and encounters are also preserved without being treated as proof of knowledge.

`src/lib/grammar/learner-policy.ts` owns evidence weighting and status thresholds. `src/lib/grammar/learner-model.ts` is the single persistence/recomputation boundary. AI integrations may submit structured observations to this boundary, but they never set a grammar status or mastery dimension directly.

The profile tracks:

- understanding
- controlled production
- free production
- evidence count and recency
- status: unassessed, assumed, learning, strong, or needs attention

Status changes use repeated weighted evidence and hysteresis. A single error cannot downgrade a demonstrated strong concept; recurring sufficiently strong errors can.

Grammar is intentionally not added to vocabulary FSRS.

## Grammar learning UI

`/grammar` is part of the Practice/Learning domain without becoming another primary mobile navigation item.

The hub prioritizes:

1. concepts needing attention
2. concepts already being learned
3. unassessed concepts in the current → target CEFR path whose prerequisites are ready
4. full curriculum browsing by CEFR/category

`/grammar/[slug]` keeps canonical teaching content concise and exposes learner-state provenance. Personal vocabulary shown there is currently a pedagogical reuse suggestion by part of speech; explicit lexeme ↔ grammar relationships are owned by issue #82.


## Grammar practice and Mistake Memory

Grammar practice reuses the existing Practice surface and `Attempt` model. A practice item may target:

- vocabulary only
- a canonical grammar concept only
- both a grammar concept and a linked vocabulary item

Pure grammar practice never requires a `UserVocabulary` record.

The first deterministic registry covers core families including:

- case and preposition selection
- article selection from linked personal nouns
- adjective endings
- pronouns and reflexive forms
- tense formation
- subordinate-clause word order
- relative clauses
- passive
- Konjunktiv II
- correction/reorder/cloze/choice formats

The server always rebuilds a grammar exercise from its canonical concept + registered variant before grading. Client-supplied expected answers are never authoritative.

Adaptive grammar sessions are bounded to 3–8 items and prioritize:

1. NEEDS_ATTENTION
2. LEARNING
3. unassessed concepts
4. recurring unresolved grammar mistakes
5. concepts closest to the current CEFR level

Recommended sessions require prerequisites to be assumed or strong. Explicitly targeted practice remains available even when a prerequisite is incomplete. Recent grammar interaction types are used to avoid needless repetition.

Every grammar response records an `Attempt`, updates canonical grammar Mistake Memory, and submits deterministic evidence through the learner-model service. Grammar practice does not create FSRS cards.

Grammar mistakes are grouped by `grammarConceptId` rather than semantic embeddings, because the canonical concept is already the strongest clustering key.

## Vocabulary ↔ grammar links

`LexemeGrammarConcept` connects a lexical unit to canonical grammar when there is a real pedagogical relationship.

A link may optionally point to the exact `LexicalPattern` that demonstrates the relationship. This preserves the distinction:

- `LexicalPattern`: word-specific fact such as `teilnehmen an + Dat.`
- `GrammarConcept`: reusable rule such as dative case or prepositional verbs
- `LexemeGrammarConcept`: the pedagogical connection between them

Relationship types are:

- EXEMPLIFIES
- GOVERNS
- TRIGGERS
- COMMON_WITH

Sources are tracked as DETERMINISTIC, AI, or MANUAL. Manual links have precedence over AI links, and AI links have precedence over deterministic inference for the same relationship.

Newly ingested vocabulary receives deterministic grammar links automatically. Existing vocabulary can be backfilled after the migration and canonical grammar seed with:

```bash
npm run db:backfill-grammar-links
```

The backfill is idempotent.

Deterministic mapping recognizes high-confidence relationships such as:

- dative/accusative markers in stored lexical patterns
- reflexive patterns
- verb + preposition patterns
- fixed-case prepositions
- two-way prepositions
- coordinating/subordinating conjunctions
- article-bearing nouns
- selected adjective/verb practice relationships

It deliberately tolerates no mapping rather than forcing every lexeme into grammar.

Any AI-origin grammar-link proposal must go through `applyAiGrammarLinks`. That boundary:

- accepts only existing, active canonical IDs
- rejects invented IDs
- rejects lexical-pattern IDs belonging to another lexeme
- drops low-confidence AI suggestions
- never creates a new GrammarConcept

Word detail pages show a compact Grammar section only when explicit links exist. Grammar concept pages and adaptive practice use those same links for personal vocabulary context.


## Generated Reading product

Reading is now the canonical generated-text learning product.

User-facing routes:

- `/reading` — generated Reading hub
- `/reading/[id]` — focused reader + comprehension + language summary
- `/stories` and `/stories/[id]` — permanent redirects for historical generated content
- `/read` — redirects to generated Reading
- existing `/read/[id]` URLs remain available only as a legacy compatibility path for previously saved paste-and-scan documents

The internal `Story` model is intentionally retained for now to avoid a risky table rename and preserve historical generated content. It is technical legacy naming only; new product code calls the experience Reading. The old Story form/generator implementation has been removed.

Generated Reading defaults to the learner's `currentLevel`. A deliberate stretch option may use `targetLevel`.

Vocabulary and grammar targets are generation preferences rather than hard quotas. Natural, coherent German wins over target coverage. The server persists only vocabulary that actually appears and grammar coverage whose canonical ID is allowlisted and whose excerpt is present in the generated text.

Grammar exposure alone never increases mastery. Only explicit grammar comprehension questions create modest `READING_COMPREHENSION` / `UNDERSTANDING` evidence. Production mastery is never changed by merely reading a structure.


## Rich grammar lessons and Teach me more

`GrammarConcept` remains the canonical curriculum definition. `GrammarLesson` is a separate, AI-generated teaching layer rendered directly inside `/grammar/[slug]`.

A stored lesson contains structured sections for intuition, use cases, recognition cues, formation, detailed rules, reference tables, progressive examples, contrasts, common mistakes, exceptions, usage notes, speaking/writing advice, memory aids, and a concise cheat sheet.

The lesson is generated from canonical concept data. AI may elaborate and teach the concept, but may not rename it, change CEFR placement, invent prerequisites, or create curriculum concepts.

Populate existing curriculum lessons after migration with:

```bash
npm run db:backfill-grammar-lessons
```

The command is resumable and idempotent. It generates only missing lessons or lessons whose `sourceContentVersion` is older than `GrammarConcept.contentVersion`.

Useful maintenance options:

```bash
npm run db:backfill-grammar-lessons -- --force
npm run db:backfill-grammar-lessons -- --concept=de.case.dative
npm run db:backfill-grammar-lessons -- --limit=5
```

`--force` regenerates matching lessons. Per-concept failures do not erase successful rows, so a normal rerun continues with missing/stale concepts.

The **Teach me more** action is separate from the persistent lesson. It opens the existing bottom-sheet interaction pattern and generates a fresh personalized explanation on demand. It receives the canonical concept, stored lesson summary, current/target level, recent concept mistakes, and explicitly linked personal vocabulary. It does not overwrite `GrammarLesson`. Each subsequent open/regeneration avoids the previous teaching angle when possible.
