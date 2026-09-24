# Next.js cache and freshness strategy

Issue #49 replaces blanket `force-dynamic` rendering with explicit request-time rendering plus scoped Data Cache entries.

## Rendering rule

All learner-specific routes remain request-time by calling Next.js `connection()`. This prevents user-specific pages from being pre-rendered as shared static output while avoiding the global cache-disabling effect of `force-dynamic`.

There are no remaining `force-dynamic` declarations in the previously dynamic app pages.

## Request deduplication

`getCurrentUser()` is wrapped in React `cache()`, so repeated user resolution during one render/request is deduplicated.

This is request-scoped memoization, not cross-user persistence.

## Cached domains

Current cached reads:

| Data | Revalidation | Tags |
| --- | --- | --- |
| Home stats | 60 s | home, vocabulary, review, mistakes |
| Vocabulary library | 5 min | vocabulary, topic packs |
| Word primary data | 5 min | word, vocabulary, review |
| Word deferred data | 5 min | word, review, mistakes, topic packs |
| Reading index | 5 min | reading |
| Writing index | 5 min | writing, topic packs |

Tags always include the user ID for user-owned domains. Word tags use the lexeme ID and contain no user data by themselves.

## Domain tags

Defined in `src/lib/cache-tags.ts`:

- `home:<userId>`
- `vocabulary:<userId>`
- `word:<lexemeId>`
- `review:<userId>`
- `progress:<userId>`
- `mistakes:<userId>`
- `usage:<userId>`
- `recommendations:<userId>`
- `topic-packs:<userId>`
- `reading:<userId>`
- `writing:<userId>`
- `conversation:<userId>`

Do not replace these with one global invalidation tag.

## Mutation invalidation

Mutations invalidate the smallest relevant domain set.

Examples:

- add/import vocabulary -> home, vocabulary, review, progress, affected words
- review rating -> home, vocabulary, review, progress, affected word
- practice result -> home, vocabulary, progress, mistakes, affected word
- resolve mistake -> home, mistakes, progress, review, affected word
- generate lexical insight -> vocabulary + affected word
- reading import/add/encounter -> reading and relevant vocabulary/word tags
- recommendation feedback -> recommendations and vocabulary domains as needed
- topic-pack changes -> topic packs, vocabulary, review/home when items are added
- writing evaluation -> writing plus learner domains and affected words

Path revalidation is retained where it provides immediate route refresh semantics; tag invalidation is the authoritative Data Cache freshness mechanism.

## Word-detail streaming

The vocabulary detail route is split into:

1. primary cached data: identity, translations, patterns, learner mastery
2. deferred cached data in a Suspense boundary: AI insight, examples, lexical graph, review history, encounters, mistakes, collections, expansion

This lets the useful above-the-fold word content render without waiting for the broader relational graph.

## Navigation and loading

High-traffic routes have route-specific `loading.tsx` files using layout-shaped skeletons:

- vocabulary
- vocabulary detail
- review
- practice
- progress
- writing detail
- reading detail

Vocabulary, word relations, reading history, and writing history links explicitly opt into prefetching for common next navigations. Search/filter state remains URL-based, so browser/Next.js back navigation preserves the query state without a duplicate client store.

## Live/session routes

Conversation, review, practice, focus, battles, and other stateful session pages remain request-time through `connection()`. They are intentionally not converted into shared cached page output.

Future optimizations may cache safe subqueries beneath those routes, but session state itself must remain fresh.

## Freshness verification

Manual regression scenarios:

1. Add a word, navigate to Words: the new word appears without a hard refresh.
2. Complete a review: Home due count and word mastery/review history update.
3. Complete practice: mastery and mistake state update.
4. Resolve a mistake: mistake list and word detail no longer show the stale open mistake.
5. Generate lexical insight: word detail streams the regenerated explanation/examples.
6. Import words: vocabulary and Home counts refresh.
7. Add a reading lexical unit: vocabulary library and word data refresh.
8. Create/evaluate writing: writing index and learner metrics refresh.

Use the structured performance events introduced in #48 to compare cached/repeated navigation and word-detail timings before and after this change.
