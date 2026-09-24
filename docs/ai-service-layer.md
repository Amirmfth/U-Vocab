# AI service layer

U-Vocab keeps the AI engine separate from the learner model and deterministic learning engine.

## Provider and model

All OpenAI access goes through `src/lib/ai/client.ts`.

Environment:
- `AI_PROVIDER=openai`
- `OPENAI_MODEL`
- `OPENAI_MAX_RETRIES` (default 2)
- `OPENAI_TIMEOUT_MS` (default 90000)

`AI_PROVIDER` is the adapter seam for a future provider. Unsupported providers fail explicitly rather than silently falling back.

## Structured outputs

Operations that return data consumed by application logic define a Zod schema beside the operation and use Responses API structured outputs.

Examples include:
- lexical analysis
- answer evaluation
- stories / reading
- word comparison
- conversation setup / turn / final evaluation
- writing task / evaluation

Freeform streamed text is reserved for conversational tutor output.

## Context selection

AI calls must receive bounded, task-relevant context instead of the full vocabulary database.

Conversation context includes:
- target lexical units and lexical patterns
- related known vocabulary
- recent relevant mistakes
- learner level and translation preference
- session goal
- a bounded recent transcript

Writing evaluation similarly receives guided targets plus a bounded set of known lexical units detected in the submitted draft.

## Streaming convention

Streaming text uses the shared constants in `src/lib/ai/streaming.ts`:
- `AI_TEXT_DELTA_EVENT`
- `AI_RESPONSE_COMPLETED_EVENT`

The consumer persists the completed output, not every delta.

## Retries and fallbacks

The OpenAI SDK client has centralized retry and timeout configuration. Product flows catch evaluator/generator errors at the service or action boundary and expose actionable failure UI. Conversation turn evaluation may degrade gracefully while preserving the chat.

## Usage and prompt telemetry

Every AI usage event records:
- provider
- model
- operation
- prompt version
- input/output/total tokens
- request ID where available
- success/error status

Prompt versions are centrally mapped in `src/lib/ai/prompt-versions.ts`. Increment the relevant version whenever prompt semantics materially change.

## Ownership boundary

AI may generate, explain, evaluate, recommend, and converse.

AI does **not** own:
- FSRS scheduling
- canonical learner mastery state
- exact lexical identity
- exact lexical graph relationships
- deterministic battle scoring

Those remain application/database logic.
