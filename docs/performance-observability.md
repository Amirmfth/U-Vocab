# Performance observability

Issue #48 establishes the baseline measurement layer for U-Vocab. The goal is to make later caching, database, and AI optimizations measurable rather than speculative.

## Structured server logs

Server-side operations use `startOperation()` from `src/lib/performance.ts`.

Every completed operation emits one JSON line with:

- `event = "u_vocab.performance"`
- operation name
- generated request ID
- success/error status
- total duration in milliseconds
- named span durations
- safe operational metadata
- error type for failures

The helper intentionally drops metadata keys named `prompt`, `content`, `message`, `draft`, `answer`, `response`, and `instructions`. Do not put raw learner-authored content in performance metadata.

Example:

```json
{
  "event": "u_vocab.performance",
  "operation": "writing.evaluate",
  "requestId": "...",
  "status": "success",
  "durationMs": 3180,
  "spans": {
    "auth": 35,
    "dbRead": 110,
    "ai": 2740,
    "dbWrite": 170
  },
  "metadata": {
    "draftChars": 1460,
    "targetCount": 9
  }
}
```

## Browser Web Vitals

`src/components/web-vitals.tsx` uses Next.js `useReportWebVitals` and emits:

- LCP
- INP
- CLS
- FCP
- TTFB
- other metrics supplied by Next.js
- current route
- rating and navigation type

These events are emitted as `u_vocab.web_vital` JSON in the browser. On Vercel, platform Speed Insights/Web Analytics may be enabled separately without changing the app's core instrumentation.

## Operation naming

Use stable dotted names:

- `page.home`
- `page.word_detail`
- `practice.evaluate`
- `writing.create`
- `writing.evaluate`
- `reading.create`
- `conversation.message`
- `ai.lexical_analysis`
- `ai.reading_analysis`
- `ai.writing_evaluation`
- `ai.conversation_turn_evaluation`
- `ai.conversation_final_evaluation`
- `ai.conversation_tutor`

Span names should describe system stages, not implementation details:

- `auth`
- `dbRead`
- `dbWrite`
- `ai`
- `context`
- `revalidation`
- `stream`

## Initial latency budgets

These are engineering targets, not guarantees. Use p50/p95 measurements from production/preview telemetry to refine them.

| Workflow | Initial target |
| --- | --- |
| Cached/common navigation | perceived response should be effectively immediate |
| Common DB-backed page server work | < 500 ms where practical |
| Non-AI mutation server work | < 500 ms where practical |
| Deterministic practice evaluation | < 300 ms server-side |
| AI-backed interaction | immediate pending/progress UI; AI time measured separately |
| Regression policy | investigate material p95 regressions before merging |

## Baseline collection

The repository did not previously emit stage-level timing data, so trustworthy before-change p50/p95 measurements are not available without inventing numbers. This issue intentionally records that limitation.

After deploying this instrumentation to preview/production, capture representative samples for:

1. Home load
2. Word detail load
3. deterministic practice evaluation
4. AI-backed practice evaluation
5. writing evaluation
6. reading analysis/import
7. conversation turn + tutor response

For each workflow record:

- p50/p95 total duration
- dominant span(s)
- failure rate
- AI duration where applicable

Use those measurements as the baseline for issues #49, #50, and #52. Do not replace them with synthetic numbers from a different environment.

## Local development

Run:

```bash
npm test
npm run lint
npm run build
```

Then exercise the workflows above and filter console output for:

```text
u_vocab.performance
u_vocab.web_vital
```

## Privacy rules

Performance logs must not contain:

- learner drafts
- conversation messages
- full prompts/responses
- API keys or secrets
- translations or imported text unless explicitly anonymized and necessary

Prefer counts, lengths, operation IDs, status, model names, and durations.
