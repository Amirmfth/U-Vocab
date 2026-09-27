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
