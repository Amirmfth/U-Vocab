# Selective client query strategy

Issue #55 adds TanStack Query as a narrow interaction/performance layer. It does **not** change U-Vocab into an SPA and does not replace Server Components, Next.js caching, Prisma, or the database as the source of truth.

## Layer responsibilities

### Server Components

Remain responsible for:

- initial route rendering
- Home
- Words library/filter results
- word detail
- Review landing summary
- Practice hub
- Writing/Reading landing and results
- Usage analytics
- Recommendations initial ranking

### Next.js cache

Remains responsible for cross-navigation server data reuse, including:

- Home stats
- vocabulary library
- word primary/secondary data
- writing/reading indexes

### TanStack Query

Used only where repeated client interaction benefits from:

- an in-memory buffer
- mutation lifecycle
- optimistic advancement
- exact rollback
- deliberate background refill

Current Query-backed read surface:

- Review session queue

Current TanStack mutation surfaces:

- Review rating
- Recommendation Add/Dismiss

There is no persisted Query cache.

## Installation and provider

Pinned dependency:

`@tanstack/react-query@5.103.2`

The root layout remains an async Server Component.

A small client `QueryProvider` wraps the application content below the server layout. It owns one browser `QueryClient` instance.

Default query behavior:

- stale time: 60 seconds
- garbage collection: 10 minutes
- query retries: 1
- mutation retries: 0
- refetch on window focus: disabled
- refetch on reconnect: enabled

Feature-specific policies can be stricter.

## Query keys

All keys are centralized in `src/lib/query-keys.ts`.

Conventions are hierarchical and deterministic:

- `["vocabulary", userScope, normalizedFilters]`
- `["word", lexemeId]`
- `["review", userScope, "queue"]`
- `["writing", sessionId]`
- `["conversation", sessionId]`
- `["usage", period, normalizedFilters]`

Filter objects are normalized by:

- trimming values
- omitting empty values
- omitting `ALL`
- sorting keys

This prevents different object insertion orders from creating duplicate cache entries.

Only keys for actually adopted Query surfaces should gain query functions. The rest document the convention for future selective adoption.

## Review queue

Review is the primary Query use case because it is a repeated interaction where the previous design required a server mutation plus navigation for each card.

### Hydration

The Review Server Component loads a buffer of up to six due cards.

That object is passed directly as Query `initialData`.

Review-specific policy:

- stale time: 30 seconds
- `refetchOnMount: false`
- `refetchOnWindowFocus: false`

Therefore mounting the hydrated client session does not immediately issue a duplicate queue request.

### Query endpoint

`GET /api/review/queue`

- authenticated with the existing current-user helper
- returns only the current learner's due queue
- private/no-store HTTP response
- used for background buffer refill, not first render

### Optimistic rating

When a learner taps Again/Hard/Good/Easy:

1. cancel an in-flight queue refresh
2. snapshot the previous queue
3. remove the rated card immediately
4. decrement the displayed due count
5. render the next buffered card immediately
6. persist the real FSRS/Review/Attempt mutation
7. retain the optimistic state on success
8. restore the exact previous queue on failure

Double grading is prevented while the mutation is pending.

A failed mutation displays an inline error and Retry action.

No mastery/FSRS result is fabricated in the browser. Only the UI queue advances optimistically; the server remains authoritative for scheduling.

### Background refill

The client does **not** refetch after every rating.

It refills only when:

- two or fewer buffered cards remain; and
- the due count indicates additional server cards exist

This changes Review from roughly:

- mutation
- server navigation / page data fetch
- mutation
- server navigation / page data fetch
- ...

to:

- one server-hydrated six-card buffer
- one mutation per rating
- one queue refill after several ratings

The exact production request reduction should be verified with browser/network profiling after deployment rather than claimed from static code alone.

## Recommendations

Recommendation Add/Dismiss is the second optimistic surface.

This is safe because both actions have a deterministic immediate UI consequence:

- Add removes the recommendation because it is now known vocabulary
- Dismiss removes the recommendation because dismissed items are excluded

Mutation behavior:

1. snapshot the current list
2. remove the row immediately
3. call the existing authenticated Server Action
4. keep the row removed on success
5. restore the previous list on failure
6. expose Retry inline

Recommendation ranking is still produced server-side. Query is not used to reproduce the ranking algorithm in the browser.

When a server refresh changes initial Recommendations (for example after rebuilding semantic embeddings), the client list reconciles to the new server props.

## Words back navigation

Vocabulary filtering/search remains URL-authoritative and server-rendered.

The application already stores all filter/search state in the URL, so duplicating it into Query would create two competing state models.

A tiny `VocabularyScrollRestoration` client helper stores only:

- the current vocabulary URL (path + query) as the key
- vertical scroll position as the value

in `sessionStorage`.

This means:

Words → Word A → Back

returns to the same:

- search
- filters
- URL
- scroll position

No vocabulary content is persisted to browser storage.

Recently fetched vocabulary/word server data continues to benefit from the Next.js cache and App Router navigation cache introduced in #49.

## Areas deliberately not moved to Query

### Vocabulary search/filter data

Not adopted.

Why:

- URL is already the correct authoritative state
- the server-side vocabulary dataset is cached
- moving filtering into Query would duplicate up to hundreds of vocabulary records in a client domain store
- #55 only needs scroll/context restoration to improve back navigation

### Word detail secondary data

Not adopted.

Why:

- already split behind Suspense
- already cached separately by Next.js
- a Query fetch would duplicate an efficient server cache path

### Practice answer evaluation

Not adopted.

Why:

- one mutation at a time
- existing Action state has explicit pending/error/result behavior
- AI results must not be optimistic

### Writing evaluation/status

Not adopted.

Why:

- current evaluation is synchronous
- explicit pending UI already exists
- polling would add network traffic without improving the architecture

If Writing becomes asynchronous later, status polling can become a justified Query use case.

### Conversation

Not adopted.

Why:

- conversation tutor output is a live streamed response
- the existing streaming state machine is more appropriate than Query polling/refetch semantics

### AI-generated panels

Not adopted.

Why:

- expensive AI outputs cannot be fabricated optimistically
- current generation cache/server actions already handle reuse and pending feedback

### Usage dashboard

Not adopted.

Why:

- filters are URL-backed
- aggregates are server-side database work
- the user does not repeatedly mutate those aggregates

### Mistake resolution

Not adopted for optimistic cluster removal in this issue.

Why:

- the page displays semantic clusters, not independent flat rows
- resolving one mistake can change cluster membership, occurrence totals, titles, and the best practice target
- removing one DOM row optimistically while retaining stale cluster metadata would be misleading

The existing explicit mutation feedback remains preferable until the cluster response itself has a safe client reconciliation contract.

## Security / privacy

TanStack Query is memory-only.

This issue does **not** add:

- localStorage Query persistence
- IndexedDB server-state persistence
- cross-tab broadcast persistence
- service-worker persistence

The only new browser-persisted value is vocabulary scroll position in sessionStorage.

## Tests

Regression tests cover:

- deterministic query-key normalization
- user-scoped Review keys
- Query client defaults
- hydrated Review no-immediate-refetch policy
- optimistic Review queue advancement
- exact Review rollback snapshot
- deliberate Review refill threshold
- optimistic Recommendation removal
- Recommendation rollback snapshot

## Measuring after deployment

Use browser Network/Performance tools plus the existing #48/#51 instrumentation.

Review:

- rating tap → next-card paint latency
- server mutation duration
- number of queue GET requests per N reviews
- failure/rollback behavior

Words:

- detail → Back restoration time
- scroll restoration correctness
- duplicate data requests

Recommendations:

- tap → row removal latency
- server mutation duration
- rollback behavior

The intended outcome is fewer avoidable navigation/data fetches and immediate safe UI feedback, without increasing background traffic or creating a second client-side domain model.
