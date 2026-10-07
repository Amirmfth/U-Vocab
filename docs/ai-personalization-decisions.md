# Low-cost AI personalization decisions

## Ownership boundary

The deterministic application remains authoritative for:

- canonical lexemes and grammar concepts;
- lexical graph edges;
- vocabulary mastery state;
- FSRS stability, difficulty, retrievability, ratings, and due dates;
- recommendation candidate generation and baseline scores;
- actual review cards, practice items, grammar concepts, and session content.

The AI decision layer only makes bounded judgments among supplied choices.

## Shared decision infrastructure

`src/lib/ai/decisions/` contains:

- the structured decision runner;
- a per-course decision cache;
- recommendation reranking;
- lexical-edge reranking;
- daily-session planning.

Decision requests:

- use the central OpenAI client and routing layer;
- use Zod Structured Outputs;
- have small operation-level output budgets;
- record normal AI usage telemetry;
- never send internal user IDs in provider payloads;
- degrade to deterministic output when provider/model/schema validation fails.

## Per-course cache

Learner-specific decisions use `AiDecisionCache`, not the shared reusable generation cache.

Cache identity includes course scope, operation, prompt version, model, dimensions, and a source fingerprint. Stored payloads contain bounded ranking/plan results only. Prompts, full histories, raw embeddings, emails, names, and long learner content are not cached.

## Recommendation reranking

The deterministic recommendation engine still performs retrieval and scoring. At most 20 top candidates can be sent for optional reranking.

Unknown IDs are ignored, duplicates are removed, and omitted valid candidates are appended in deterministic order.

Flag:

`AI_RECOMMENDATION_RERANK_ENABLED=true`

## Lexical-edge reranking

Only existing `LexemeRelation` IDs can be selected. The initial product integration is word detail. At most 12 existing edges are considered and at most 5 are shown in the personalized subset.

The model cannot create a relation, change its type, or persist graph truth.

Flag:

`AI_LEXICAL_EDGE_RERANK_ENABLED=true`

## Evaluator intelligence

Existing evaluator calls now return bounded cause, confidence, intervention, and mastery-evidence signals. No extra classification call is made.

Local edit distance supplies an obvious typo signal before the request. High-confidence incorrect evidence can affect deterministic negative mastery deltas and mistake persistence; low-confidence guesses cannot become strong learner state.

AI still never assigns canonical mastery levels.

## Daily session planning

The deterministic focus planner first proves which activities/content are available. AI may allocate the requested 5/10/15/20 minutes only among those activity types.

Server validation enforces:

- allowed/available activities;
- maximum five segments;
- total requested time;
- urgent due-review inclusion;
- duplicate merging.

Actual cards, lexemes, readings, and grammar concepts remain selected by deterministic services. Invalid plans fall back to normalized deterministic composition.

Flag:

`AI_DAILY_SESSION_PLANNER_ENABLED=true`

## Cost and observability

Use `AiUsageEvent` to inspect operation/model/prompt version/tokens/cost/latency/status/routing reason. New decision operations should remain a small fraction of long-form generation cost because they use bounded payloads, tiny output schemas, caching, and the fast route.


## Native Decisions API

The bounded decision layer now supports native OpenAI `/v1/decisions` scoring/classification rather than requiring Structured Outputs generation for every judgment. See `docs/openai-decisions-api.md` for rollout modes, privacy, fallbacks, and migrated workloads.
