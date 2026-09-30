# Plans, entitlements, subscriptions, and quotas

U-Vocab resolves product access through the internal entitlement layer. Learning code must not query a payment provider directly and must not trust a client-supplied plan.

## Effective plan precedence

1. An active or grace-period paid PRO subscription whose current period contains the current time.
2. A non-revoked, currently valid manual/promo PRO grant.
3. FREE.

A subscription canceled at period end remains `ACTIVE` with `cancelAtPeriodEnd=true` until its period ends. `CANCELED`, `EXPIRED`, and `REVOKED` states do not grant access.

## Central configuration

Commercial feature flags and quotas live in:

`src/lib/entitlements/config.ts`

Current Free defaults include five genuine vocabulary additions per learner-local day. Other AI-heavy actions use small monthly Free allowances. Pro uses high fair-use ceilings instead of unlimited provider spend.

Product quota keys are intentionally separate from AI operation names. A shared lexicon hit can count as a vocabulary addition while making zero AI calls.

## Server APIs

Use:
- `getEffectivePlan(userId)`
- `getEntitlements(userId)`
- `requireEntitlement(userId, feature)`
- `checkQuota(...)`
- `consumeQuota(...)`

`consumeQuota` writes an append-only `QuotaUsageEvent` inside a serializable transaction. The idempotency key is scoped to the user, operation, quota period, and source reference.

Daily periods use the learner timezone stored on the account.

## Provider-neutral billing contract

`src/lib/billing/service.ts` exposes normalized operations for:
- activation;
- renewal;
- cancel-at-period-end;
- expiry;
- revoke/refund;
- manual grants.

Future Stripe, Google Play, or other webhook adapters should authenticate and deduplicate provider events, then call this service. Learning features should remain unaware of provider-specific APIs.

## Temporary Pro grants

For local/support testing:

`npm run entitlement:grant-pro -- --email=user@example.com --days=7`

The grant is independent of payment records and expires automatically.

## Spend safety

Quota rules are product allowances. Provider-spend safety is a separate emergency layer using recorded AI cost and action volume.

Environment controls:
- `MAX_EXPENSIVE_ACTIONS_PER_USER_HOUR` (default 60)
- `MAX_PROVIDER_COST_USD_PER_USER_DAY` (default 10)
- `MAX_PROVIDER_COST_USD_GLOBAL_DAY` (default 250)

When a safety threshold is reached, expensive endpoints fail closed with a generic product error and do not expose provider/billing internals.

## UI

Settings shows the effective plan, renewal/expiry state when applicable, and current allowances. Checkout/manage controls are placeholders until a payment-provider issue connects them.

Reusable components live in `src/components/entitlement-primitives.tsx`.
