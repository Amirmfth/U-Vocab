# Database optimization audit

Issue #50 focuses on reducing Prisma/Postgres round trips while preserving the existing learning algorithms and transactional guarantees.

## Principles used

- Batch N+1 reads with `findMany(... in ...)`.
- Batch homogeneous inserts with `createMany`.
- Use set-based SQL for per-row mastery/counter values that cannot be expressed as one Prisma `updateMany`.
- Keep AI/network work outside database transactions.
- Keep transactions limited to state that must change atomically.
- Prefer narrow `select` projections to broad `include` graphs.
- Add indexes only for query shapes that are present in the application.

## Writing evaluation

### Previous shape

For each lexical item marked as used:

1. `UserVocabulary.findUnique`
2. `Attempt.create`
3. `UserVocabulary.update`

Then mistake recording repeated lookup/update/create work per lexical mistake.

For N used lexical items, the persistence phase grew by roughly 3N database statements, before mistake persistence.

### Current shape

1. one `UserVocabulary.findMany` for all used lexeme IDs
2. one writing-session update
3. one `Attempt.createMany`
4. one set-based `UPDATE UserVocabulary ... FROM (VALUES ...)`
5. one batched unresolved-mistake lookup plus bounded persistence

The number of mastery/attempt statements is now constant with respect to the number of used lexical items.

AI evaluation remains outside the transaction.

## Conversation turns

### Previous shape

For each used target:

1. one `UserVocabulary.findUnique`
2. one transaction containing:
   - ConversationTarget update
   - Attempt create
   - UserVocabulary update
3. mistake persistence for that target

### Current shape

1. one `UserVocabulary.findMany` for all used targets
2. one set-based ConversationTarget counter update
3. one `Attempt.createMany`
4. one set-based UserVocabulary mastery update
5. one batched mistake persistence pass

The turn-level AI request still completes before database persistence begins.

## Reading analysis/import

### Previous shape

Inside one potentially long transaction, every lexical unit could perform:

- lexeme lookup
- lexeme create or update
- nested translation/pattern/example persistence
- ReadingItem create

This produced multiple statements per lexical unit and held the transaction open while iterating the entire result set.

### Current shape

Before the transaction:

1. deduplicate lexical units
2. one lookup for all existing lexemes

Inside the transaction:

1. bulk-create missing lexemes
2. fetch all resolved lexeme IDs and minimal enrichment state
3. bulk-create missing translations
4. bulk-create missing patterns
5. bulk-create examples for newly introduced lexical units
6. create the ReadingDocument
7. bulk-create ReadingItems

The transaction timeout is reduced from 60 seconds to 20 seconds because the transaction no longer performs per-item query waterfalls.

## Topic packs

Topic-pack generation previously performed one lexeme upsert and one TopicPackItem insert per generated item.

It now:

1. deduplicates generated lexical units
2. looks up existing lexemes in one query
3. bulk-creates missing lexemes
4. bulk-creates missing translations
5. creates the TopicPack
6. bulk-creates TopicPackItems

Adding or launching a pack now uses `UserVocabulary.createMany({ skipDuplicates: true })` instead of one no-op upsert per pack item.

## Mistakes

The shared mistake recorder now:

1. groups same lexeme/type mistakes while preserving the full occurrence count
2. loads unresolved matching mistakes once
3. bulk-creates new mistake rows
4. updates only existing rows
5. performs semantic embedding after database persistence, never inside a transaction

This benefits Practice as well as Writing and Conversation.

## Conversation completion

Encounter persistence is now one `createMany({ skipDuplicates: true })` instead of one encounter upsert per target.

## Focus completion

Focus-session summary previously loaded every Attempt row for the session and aggregated it in application memory.

It now uses a grouped database aggregate by correctness and returns only:

- attempt counts
- correct attempt counts
- duration sums

The review count remains a parallel count query.

## Dashboard / analytics audit

### Home

Already optimized by #49:

- four independent counts execute in parallel
- results are cached per user/domain

No additional database rewrite is justified in this issue.

### Progress

The ten independent analytics queries already execute in parallel.

This issue narrows the topic-pack relation projection so it fetches only the fields required for coverage calculation. A larger materialized analytics model would be premature at current scale.

### AI Usage

The aggregates/grouping/recent-query set already executes in parallel and has the relevant user/date, user/operation/date, and user/model/date indexes.

This issue narrows the recent-event projection to the five fields actually rendered.

## Single-item workflows intentionally retained

### Review / FSRS

A review is one learner-state transition plus one Review and one Attempt record in one transaction. This is already a bounded atomic workflow; batching it would not reduce an N+1 pattern.

### Battle answer

One answer affects one question, one battle aggregate, one Attempt, and optionally one vocabulary row. It is intentionally atomic per submitted answer.

## Added indexes

Migration: `20260925043000_database_hot_path_indexes`

- `LexicalPattern(lexemeId)`
  - word detail, writing, conversation, and story pattern relations
- `Example(lexemeId)`
  - word detail / exercise example relation loads
- `LexemeRelation(targetId, type)`
  - reverse/incoming lexical graph lookups
- `UserVocabulary(userId, addedAt)`
  - vocabulary ordering and recent-known-vocabulary scans
- `Mistake(userId, resolvedAt, lastOccurredAt)`
  - unresolved mistake lists and recency ordering
- `TopicPackItem(lexemeId)`
  - vocabulary-to-pack reverse relation loads

Existing indexes already cover:

- user + vocabulary state
- user + next review
- attempts by user/date
- review history by vocabulary/date
- encounters by user/lexeme/date
- AI usage by user/date, operation/date, and model/date
- topic packs by user/date
- reading documents by user/date
- learning sessions by user/status/activity time
- conversations by user/status/update time
- battle sessions by user/start time
- writing sessions by user/date

## Performance verification

Issue #48 added `u_vocab.performance` events with `dbRead` and `dbWrite` spans.

After deploying this branch, compare representative runs for:

- `writing.evaluate`
- `reading.create`
- conversation turn processing
- focus completion

The structural statement counts above are deterministic from the code change. Actual latency improvement depends on data volume, database location/load, and connection latency, so this document intentionally does not invent millisecond improvements without deployed telemetry.

For writing and reading specifically, compare p50/p95 database span duration before and after this PR once enough production/preview samples exist.

## Correctness checks

Regression coverage added for:

- lexical deduplication used by reading/topic-pack import
- same-key mistake occurrence preservation
- existing mistake occurrence increments
- one set-based mastery statement for multiple vocabulary rows
- one set-based target-counter statement for multiple conversation targets

Existing FSRS/review-selection tests remain unchanged.
