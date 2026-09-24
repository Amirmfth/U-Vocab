# AI pipeline optimization

Issue #52 makes model choice and token budgets explicit while preserving the typed `src/lib/ai` architecture.

## Routing policy

All text generation goes through `aiRoute(operation)` in `src/lib/ai/routing.ts`.

The defaults intentionally split operations into two groups:

| Operation | Default model | Max output tokens |
| --- | --- | ---: |
| lexical analysis | `gpt-5-mini` | 1,800 |
| answer evaluation | `gpt-6-luna` | 900 |
| writing task | `gpt-6-luna` | 700 |
| writing evaluation | `gpt-5-mini` | 4,200 |
| reading analysis | `gpt-5-mini` | 3,200 |
| conversation setup | `gpt-6-luna` | 800 |
| conversation turn evaluation | `gpt-6-luna` | 900 |
| conversation final evaluation | `gpt-5-mini` | 2,200 |
| conversation tutor | `gpt-6-luna` | 900 |
| word comparison | `gpt-5-mini` | 2,400 |
| word expansion | `gpt-6-luna` | 1,600 |
| lexical insight | `gpt-5-mini` | 2,200 |
| story generation | `gpt-5-mini` | 3,600 |
| topic-pack generation | `gpt-6-luna` | 2,600 |

Focused, repetitive, highly constrained tasks default to the fast model. Rich language-generation/evaluation tasks remain on the stronger existing model until quality evidence supports moving them.

### Environment overrides

- `OPENAI_MODEL` — legacy/general complex-model fallback
- `OPENAI_COMPLEX_MODEL` — override complex operations
- `OPENAI_FAST_MODEL` — override focused/high-volume operations
- `OPENAI_MODEL_<OPERATION>` — override one operation, for example:
  - `OPENAI_MODEL_WRITING_EVALUATION`
  - `OPENAI_MODEL_READING_ANALYSIS`
  - `OPENAI_MODEL_CONVERSATION_TUTOR`

Feature files must not add model literals. New operations belong in `routing.ts`.

## Prompt payload rules

Provider payloads no longer serialize internal `userId` values.

Database IDs are retained only when structured output must map back to records, for example target lexeme IDs in writing/conversation evaluation.

Avoid sending:

- user IDs
- redundant translations
- full vocabulary collections
- full histories when a bounded recent window is enough
- deterministic counts that code can compute

## Writing evaluation

The writing path now performs deterministic preprocessing before AI:

- word count is computed locally
- repeated content words are counted locally
- known vocabulary is detected locally
- guided targets are always included
- only detected relevant known vocabulary is added

Previously the evaluator could receive up to 35 rich lexical records. It is now bounded to at most 18 total records, with detected non-required vocabulary limited to 12 and patterns limited to three for detected items.

The evaluator receives precomputed word/repetition signals rather than spending model tokens rediscovering them.

Output is also bounded through:

- operation `max_output_tokens`
- smaller feedback list limits
- bounded individual feedback strings
- bounded improved-version length

## Reading analysis

Reading is staged instead of sending the complete document and asking for up to 120 fully enriched units.

Current pipeline:

1. deterministic tokenization/normalization
2. load learner-known vocabulary
3. remove known lexical tokens
4. frequency-rank remaining candidates
5. keep at most 30 candidates
6. build a relevant excerpt capped at 12,000 characters
7. ask AI for semantic/lexical judgment over the excerpt and candidates
8. accept at most 30 enriched lexical units

The model is still allowed to discover multi-word phrases, collocations, idioms, reflexive/separable constructions, and verb-preposition patterns from the excerpt. Candidate ranking is a filter/prioritization mechanism, not a brittle replacement for semantic judgment.

The original document remains stored unchanged.

## Practice evaluation

Exact/normalized exercise types are deterministic whenever an expected answer exists:

- meaning recall
- reverse recall
- article
- cloze
- contextual choice

AI remains in the loop for production/naturalness cases where accepted alternatives and context matter.

When AI is needed, lexical context is capped at:

- three patterns
- two examples

## Conversation

Turn evaluation already receives only the current learner message and targets.

Additional bounds in this issue:

- tutor history: 8 recent messages
- final evaluation transcript: 24 recent messages
- related known lexical items: 8
- relation fan-out per target: 3
- unresolved target mistakes: 6
- tutor output: 900 tokens

Incremental target use/correctness counters remain the primary deterministic session signal and are available to final evaluation.

## Reusable generation cache

`AiGenerationCache` stores only reusable, non-user-specific generation artifacts.

Initial cached operations:

- word comparison
- word expansion

Cache identity includes:

- operation
- relevant lexical dimensions
- prompt version
- schema version

The stored source hash includes the lexical source data used for generation. A change to patterns/examples/source data invalidates the hit automatically.

No user ID, user-authored text, conversation content, writing, reading document, or private learner context is placed in the shared generation cache.

Existing `LexemeInsight` persistence remains the reusable store for generated lexical explanations/examples on a lexeme + CEFR-level basis. Its explicit regenerate action continues to refresh content rather than silently returning a global cache hit.

## Cache invalidation

A reusable cache entry stops matching when any of these change:

- prompt version
- schema version
- cache dimensions
- source lexical fingerprint

Prompt versions for optimized pipelines were incremented to `v2`.

## Quality fixtures

`src/lib/ai/eval-fixtures.ts` contains representative German-learning cases for:

- lexical analysis
- free-sentence practice evaluation
- writing evaluation
- reading lexical extraction
- conversation target usage

The fixture set is deliberately small. It is intended for repeatable manual/provider regression runs when changing a route/model, not as a substitute for production telemetry.

Pure deterministic behavior is covered by automated tests for:

- reading candidate ranking
- known-lexeme detection
- repetition detection
- reading excerpt bounds
- operation budgets
- generation source fingerprints

## Measuring impact

Use the durable telemetry from #51 to compare per operation before and after deployment:

- average input tokens/request
- average output tokens/request
- cached input tokens
- average recorded cost/request
- average duration
- failure rate
- model distribution

Expected structural improvements:

- simple/high-volume operations can route to the lower-cost fast model
- reading input is bounded at 12k characters and output at 30 lexical units
- writing lexical context falls from up to 35 records to at most 18
- exact practice paths avoid provider requests entirely
- tutor/final-conversation history is bounded
- repeated comparisons/expansions create no provider request on valid cache hits

Do not claim a production percentage improvement until the Usage dashboard contains enough post-deploy samples for a meaningful before/after comparison.
