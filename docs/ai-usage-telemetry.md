# AI usage telemetry

Issue #51 extends the existing AI usage log into a request-level operations and cost ledger.

## Event contract

Every provider request outcome creates at most one `AiUsageEvent`.

Persisted fields include:

- provider / model / operation / prompt version
- success or error status
- input, cached-input, output, reasoning, and total token counts
- request-time input/cached-input/output/reasoning cost components
- request-time total cost and currency
- pricing snapshot key
- duration
- time-to-first-token for streaming requests
- provider request ID when available
- error category/type
- retry count when actually available
- safe operational metadata
- created timestamp

Historical rows created before this migration are preserved. New cost/latency fields remain nullable when the historical/provider data is unavailable.

## Exactly-once request recording

`createAIUsageRecorder()` owns request outcome persistence.

It has an internal single-write guard. A structured-output parse failure can therefore:

1. record the failed provider response with its usage and request ID;
2. throw;
3. flow through the helper catch block;
4. attempt failure recording again without creating a duplicate row.

This fixes both lost-usage and double-error-log failure modes.

## Duration

The recorder starts immediately before each provider request path.

For non-streaming structured requests, `durationMs` covers provider request + structured parsing/validation until the outcome is known.

For the conversation tutor stream, `durationMs` covers the complete stream and `timeToFirstTokenMs` is captured at the first text delta.

The application does not invent SDK retry counts. `retryCount` remains null unless a provider adapter can supply a reliable actual count.

## Token details

OpenAI Responses usage is mapped as:

- `input_tokens` -> input tokens
- `input_tokens_details.cached_tokens` -> cached input tokens
- `output_tokens` -> output tokens
- `output_tokens_details.reasoning_tokens` -> reasoning tokens
- `total_tokens` -> total tokens

Cached input is a subset of input tokens. Cost calculation therefore bills:

- uncached input = input - cached input at the input rate
- cached input at the cached-input rate
- all output at the output rate

Reasoning cost is recorded as the reasoning-token subset of output cost for visibility. It is **not** added a second time to total cost.

## Pricing snapshot

Pricing is centralized in `src/lib/ai/pricing.ts`.

The initial snapshot is `openai-standard-2026-09-25`, verified against the official OpenAI API model/pricing pages on 2026-09-25.

Known entries currently cover the application's configured/default GPT-5 Mini family plus GPT-5. Unknown provider/model pairs are intentionally left unpriced:

- token facts are still recorded;
- pricing key is null;
- cost fields are null;
- the Usage page surfaces them as unpriced.

Do not silently fall back to the price of a different model.

When provider pricing changes, add a new snapshot key rather than editing the historical meaning of an existing key.

## Privacy

Raw prompts and responses are not stored in `AiUsageEvent`.

Metadata is limited to operational facts such as:

- character or word counts
- target counts
- CEFR level
- generation mode
- exercise type
- reading length bucket

The persistence layer also rejects common sensitive metadata keys including `answer`, `content`, `draft`, `instructions`, `message`, `prompt`, `response`, and `text`.

## Instrumented AI paths

The request recorder is used by:

- lexical analysis
- vocabulary answer evaluation
- writing task generation
- writing evaluation
- reading analysis
- conversation setup
- conversation turn evaluation
- conversation final evaluation
- conversation tutor streaming
- word comparison
- word expansion
- lexical insight
- story generation
- topic-pack generation

## Usage dashboard

The Usage page now answers:

- recorded cost today (in the user's saved timezone)
- 7-day, 30-day, and all-time recorded cost
- total requests and failure rate
- total/input/output/cached token counts
- unpriced historical/unknown-model requests
- filtered request count/cost/average cost/average latency
- cost over time
- breakdown by operation
- breakdown by model
- recent request-level token, latency, TTFT, pricing, status, and cost details

Filters are URL-backed and cover:

- period
- operation
- model
- status

The request explorer is a stacked mobile layout and expands its metric grid at larger breakpoints.

## Validation focus

Regression tests cover:

- known-model pricing
- cached-input pricing
- reasoning-cost accounting without double counting
- unknown-model pricing
- successful usage recording
- failed usage recording
- parse-failure single-write behavior
- usage summary aggregates
- operation grouping

The telemetry introduced by #48 remains complementary: performance events answer end-to-end application latency questions, while `AiUsageEvent` is the durable provider-request cost/usage ledger.
