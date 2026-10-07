# OpenAI Decisions API migration

U-Vocab uses the OpenAI Decisions API for bounded judgment workloads and the Responses API for generated language.

## Core rule

- Deterministic code owns truth and state.
- Decisions judges.
- Responses creates.

Decisions must never own FSRS scheduling, canonical mastery state, grammar curriculum truth, canonical lexemes, CEFR metadata, or lexical graph edges.

## API status

The Decisions API entered public beta on 2026-10-06. U-Vocab therefore uses operation-level rollout modes and preserves Responses/deterministic fallbacks.

The native transport calls `POST /v1/decisions` directly so this migration does not require an OpenAI SDK major-version upgrade. The configured model defaults to `gpt-6-luna`.

Supported Decisions question types used by U-Vocab:

- predicate — yes/no probability;
- choice — fixed option plus confidence/probabilities;
- score — bounded rubric score plus confidence/probabilities.

## Rollout modes

Every migrated operation supports:

- `off`: existing behavior only;
- `shadow`: existing behavior remains authoritative while Decisions also runs for comparison/telemetry;
- `on`: Decisions is authoritative when complete/confident; existing behavior remains the fallback.

Global kill switch:

`OPENAI_DECISIONS_ENABLED=false`

Per-operation controls are documented in `.env.example`.

## Migrated workloads

### Recommendation reranking

The deterministic recommender produces the candidate set. Decisions scores each supplied candidate and classifies its strongest pedagogical reason. Application code sorts locally.

The model never returns or invents candidate IDs as ranking output.

### Lexical relationships

Only persisted `LexemeRelation` candidates are supplied. Decisions scores usefulness and classifies pedagogical purpose. TypeScript sorts/truncates the existing relationships.

### Daily session planning

Decisions scores priority for already-available deterministic activities. It does not allocate minutes. TypeScript allocates the requested duration deterministically, with due-review urgency enforced locally.

### Conversation turns

Decisions evaluates target attempted/correct/naturalness and bounded mistake/cause/intervention categories. The conversation tutor remains a Responses generation call.

High-confidence negative evidence may update deterministic learner state. Low-confidence evidence does not.

### Free production

The evaluator uses deterministic/local signals first, then Decisions. High-confidence Decisions results can produce deterministic feedback. Ambiguous/failed Decisions requests fall back to the existing Responses evaluator.

### Reading lexical analysis

Deterministic preprocessing produces candidate tokens. Decisions filters/ranks the bounded candidate list before rich lexical enrichment, reducing the expensive downstream payload.

### Writing

Decisions scores rubric dimensions, target usage, and semantic evaluation complexity. Responses still generates corrections, strengths, improvements, grammar explanations, and improved text. In `on` mode, Decisions rubric scores are used for the deterministic overall calculation.

### Final conversation

Decisions provides session-wide task success, grammar, vocabulary, naturalness, and target-use scoring. Responses remains responsible for generated summary/strengths/improvements.

## Privacy

- Provider evidence excludes internal user IDs.
- `safety_identifier` is a stable SHA-256-derived opaque identifier, never the authenticated ID itself.
- Full vocabulary histories are not sent.
- Decision caches store bounded outputs/fingerprints only.
- Telemetry metadata rejects raw answer/content/draft/message/prompt/text fields.

## Failure behavior

A Decisions refusal, missing named answer, timeout, rate limit, invalid response, or low-confidence free-production result never directly mutates learner state.

The operation either:
1. uses its Responses fallback; or
2. returns its deterministic fallback.

## Telemetry

Native Decisions usage is recorded through `AiUsageEvent` with:
- `endpoint=decisions`;
- predicate/choice/score question counts;
- input/output tokens;
- compute units when exposed;
- refusal count;
- retry count;
- normal duration/model/prompt-version fields.

Decisions commonly report zero output tokens; telemetry must preserve that rather than inventing generated-token cost.

## Rollback

1. Set `OPENAI_DECISIONS_ENABLED=false`.
2. Redeploy.
3. Existing Responses/deterministic paths become authoritative without schema rollback.
4. Keep `AiDecisionCache` rows; they are inert while Decisions is disabled.
