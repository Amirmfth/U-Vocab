# Internal admin panel

Issue #102 adds a server-authorized operational area at `/admin`.

## Access model

`User.role` is a database-backed `UserRole` enum:

- `USER` — normal learner account;
- `ADMIN` — internal administrator.

The role is enforced server-side through `requireAdmin()`.

The entire `/admin` route tree is guarded in its server layout. Every admin server action independently calls `requireAdmin()` again. The legacy `/usage` route is also admin-only and redirects authorized administrators to `/admin/usage`.

Do not add admin behavior based on hidden links, browser state, or environment-only role flags.

## First administrator bootstrap

The bootstrap script only promotes an **existing verified account**.

After applying the database migration and creating/verifying the intended account:

```bash
npm run admin:promote -- --email admin@example.com
```

The command refuses to promote unverified users.

Once an ADMIN already exists, the command refuses further promotions by default. Normal ongoing administration should use application-controlled admin workflows rather than the bootstrap command.

For emergency recovery only:

```bash
ALLOW_ADMIN_BOOTSTRAP_WITH_EXISTING=true npm run admin:promote -- --email recovery-admin@example.com
```

Treat database/CLI access as privileged production access. Remove the emergency environment override immediately after use.

## Sections

### Dashboard

Shows bounded operational summaries:

- total/new/30-day active users;
- effective Free/Pro counts;
- active subscriptions;
- recorded AI spend today/7d/30d;
- AI cost per active user;
- AI request failure rate;
- high-cost operations;
- recent lexicon flags;
- recent privileged admin mutations.

Active user is defined from internal activity records (AI requests, attempts, or learning sessions) within the last 30 days.

### Users

`/admin/users` is paginated (25/page) and supports:

- user ID/email search;
- effective Free/Pro filtering using database `EXISTS` predicates;
- verified/unverified account state;
- signup-date lower bound.

User detail intentionally selects operational metadata only:

- account ID/email/role/verification/signup;
- courses and CEFR settings;
- vocabulary/attempt/mistake counts;
- plan/subscription/grant state;
- quota consumption;
- AI spend/tokens;
- recent AI operation metadata.

It does **not** select conversation messages, writing drafts, or reading content.

Admin actions include:

- grant a time-bounded Pro entitlement;
- revoke a manual entitlement;
- revoke all sessions / force sign-out.

Provider customer/subscription identifiers are not editable through generic forms.

### AI Usage

`/admin/usage` uses `AiUsageEvent` as the authoritative source.

Filters:

- user ID;
- course ID;
- operation;
- model;
- status;
- date range.

Metrics:

- recorded cost;
- tokens;
- failure rate;
- average cost;
- latency;
- TTFT;
- cost by feature;
- cost by model;
- top-cost users;
- unpriced events.

The request explorer does not show prompts, responses, metadata blobs, or learner text.

### Lexicon

`/admin/lexicon` supports:

- canonical/alias search;
- review-state filtering;
- aliases;
- senses/translations;
- examples/patterns;
- provenance/provider/model/prompt/content versions;
- probable canonical duplicate diagnostics;
- alias collision diagnostics;
- canonical lemma/article/plural/gender/CEFR/POS edits;
- validated alias add/remove;
- accepted/flagged/curated review state changes;
- transactional duplicate merge.

The merge service repoints dependent records first, de-duplicates composite relationships, preserves learner review/attempt history, handles confusion/relation collisions, and deletes the source lexeme only at the end of the transaction.

### Subscriptions

Shows provider subscription state and manual grants. Provider identifiers are read-only. Revoking a manual grant is an audited action.

### System

Shows U-Vocab-owned operational state:

- environment/release;
- database reachability;
- latest Prisma migration when available;
- 24-hour AI failures;
- admin audit history;
- current background-job status.

The app does not recreate Sentry issue browsing or PostHog funnels. Set optional links:

```env
SENTRY_DASHBOARD_URL=
POSTHOG_DASHBOARD_URL=
```

## Audit log

Privileged mutations write `AdminAuditLog` records containing:

- admin user ID;
- action;
- target type/ID;
- timestamp;
- correlation request ID;
- bounded structured metadata.

Known private fields such as content, messages, drafts, prompts, responses, email, passwords, session/cookie/token/secret values are removed by the shared audit sanitizer.

Audit records are append-only by application design. No update/delete admin API is provided.

## Performance

Admin list screens use pagination and database-side filters/aggregates.

Issue #102 adds global indexes for:

- user role/signup browsing;
- AI operation + creation time;
- AI model + creation time;
- AI status + creation time;
- AI creation time.

Avoid replacing these queries with `findMany()` over the entire user/AI/lexicon dataset followed by JavaScript aggregation.

## Destructive actions

Session revocation, entitlement revocation, alias removal, canonical edits, review-state changes, and lexeme merge use explicit confirmation controls where appropriate.

Lexeme merge is not implemented as “delete source then repair references.” It is one database transaction and the source delete is the final data mutation before the completed audit record.
