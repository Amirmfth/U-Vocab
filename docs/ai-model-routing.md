# AI model routing

Verified against the official OpenAI API model/pricing documentation on 2026-10-06.

## Defaults

U-Vocab keeps model selection centralized in `src/lib/ai/routing.ts`.

- Fast/focused default: `gpt-6-luna`
- Complex default: `gpt-6.1-sol`
- Embeddings remain `text-embedding-3-small`
- Completed-file transcription remains `gpt-transcribe`

Feature files must not own provider model literals.

## Overrides

The routing layer preserves:

- `OPENAI_FAST_MODEL`
- `OPENAI_COMPLEX_MODEL`
- legacy global `OPENAI_MODEL`
- per-operation `OPENAI_MODEL_<OPERATION>`

Per-operation overrides win.

## Decision operations

These are statically fast-routed and never require another model call merely to choose a model:

- `recommendation_rerank` — max 420 output tokens
- `lexical_edge_rerank` — max 320 output tokens
- `daily_session_plan` — max 320 output tokens

## Request-complexity routing

Only selected expensive evaluation operations can move between fast and complex routes using deterministic request properties. The initial implementation applies this to writing evaluation and final conversation evaluation.

The routing reason is recorded in AI usage metadata:

- `STATIC_FAST`
- `STATIC_COMPLEX`
- `REQUEST_COMPLEXITY_FAST`
- `REQUEST_COMPLEXITY_COMPLEX`
- `ENV_OVERRIDE`
- `FALLBACK`

No model-based router is used.

## Updating models

When OpenAI changes model availability:

1. verify the current model list and API compatibility in official OpenAI documentation;
2. update the centralized defaults only;
3. update pricing metadata separately from learner logic;
4. run routing tests and the full CI suite;
5. use environment overrides for immediate rollback if quality regresses.


## Decisions endpoint

Judgment workloads migrated to OpenAI Decisions use `OPENAI_DECISIONS_MODEL` (default `gpt-6-luna`) independently of Responses fast/complex routing. Decisions does not use an LLM router call. Writing still uses semantic Decisions preflight to select the existing Responses FAST/COMPLEX route for generated feedback.
