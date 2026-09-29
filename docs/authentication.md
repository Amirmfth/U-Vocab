# Authentication

U-Vocab uses Better Auth with Prisma/PostgreSQL for multi-user email/password authentication.

## Required production configuration

Set:

```env
BETTER_AUTH_SECRET="<high-entropy secret, at least 32 bytes>"
BETTER_AUTH_URL="https://your-production-origin.example"
RESEND_API_KEY="..."
AUTH_EMAIL_FROM="U-Vocab <auth@your-domain.example>"
```

Optionally set `BETTER_AUTH_TRUSTED_ORIGINS` to a comma-separated list of explicit preview/staging origins.

Authentication email uses the Resend HTTP API. In non-production environments only, if Resend is not configured, verification and reset URLs are written to the server console so the flows can be tested locally.

## Database migration

Apply the Prisma migration before deploying the new application:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration extends the existing `User` table in place and creates Better Auth `Session`, `Account`, `Verification`, and `RateLimit` tables. It does **not** replace or regenerate existing U-Vocab user IDs.

## Migrating an existing single-user deployment

The old app selected its learner using `APP_USER_EMAIL`. Before removing the old deployment, note that email address.

After applying the new migration, bootstrap a password credential onto that exact existing `User` row:

```bash
AUTH_BOOTSTRAP_EMAIL="existing@example.com" \
AUTH_BOOTSTRAP_PASSWORD="<10-128 character password>" \
AUTH_BOOTSTRAP_NAME="Existing learner" \
npm run auth:bootstrap
```

The command:

1. requires the user to already exist;
2. preserves `User.id`;
3. marks that existing account email as verified;
4. creates or rotates the Better Auth credential account;
5. invalidates existing Better Auth sessions;
6. does not touch vocabulary, reviews, FSRS cards, attempts, grammar evidence, reading, writing, conversation, or AI usage rows.

It is idempotent for the same existing learner. Do not use it to create normal new users; use `/signup`.

After migration, remove the old deployment variables:

- `APP_USER_EMAIL`
- `APP_AUTH_USERNAME`
- `APP_AUTH_PASSWORD`
- `APP_AUTH_DISABLED`

## Routes

Public authentication pages:

- `/login`
- `/signup`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

Better Auth HTTP endpoints are mounted under `/api/auth/[...all]`.

All learning pages are protected. Middleware validates the database-backed session before allowing page navigation, while server actions and route handlers still resolve the authenticated user through `getCurrentUser()` as the authorization boundary.

`/api/health` remains public for deployment health checks.

## Security notes

- Better Auth owns password hashing and session-cookie creation.
- Passwords are never stored directly on `User`; the credential hash lives in the Better Auth `Account` record.
- Session cookies are HttpOnly and become Secure in production.
- Email verification is required for new password accounts.
- Password reset revokes existing sessions.
- Auth endpoints use database-backed rate limits; sign-in/sign-up/reset/verification endpoints have stricter rules.
- Internal return URLs are sanitized to prevent open redirects.
- Application code must never authorize from a client-provided user ID.
