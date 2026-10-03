# Review reminder Web Push

U-Vocab Web Push starts with one intentionally narrow notification:

> You have N words ready for review.

There are no marketing notifications, streak-pressure notifications, or one-push-per-word behavior.

## Architecture

The feature uses:

- the existing Serwist service worker;
- standards-based Push API subscriptions;
- the `web-push` server library with VAPID;
- one database row per browser/device endpoint;
- one course-aware review reminder preference;
- an idempotent notification delivery ledger;
- a scheduler endpoint that can be called by Vercel Cron or another deployment scheduler.

Core review reminders are available to both Free and Pro users.

## Generate VAPID keys

Generate a keypair once:

```bash
npx web-push generate-vapid-keys
```

Configure:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@uvocab.ir"
NOTIFICATION_CRON_SECRET="long-random-secret"
```

Only the public VAPID key is exposed to browser code. Never prefix the private key with `NEXT_PUBLIC_`.

The VAPID subject should be a valid `mailto:` or HTTPS contact URI.

## Permission flow

U-Vocab never requests notification permission on page load.

The learner must open Settings and explicitly choose **Enable review reminders**.

The browser flow is:

1. explain the reminder behavior;
2. learner clicks enable;
3. request browser permission;
4. wait for the active service worker;
5. create/reuse a `PushSubscription`;
6. store endpoint + encryption keys under the authenticated user;
7. enable the active course preference.

A user can have multiple active device subscriptions.

Disabling reminders turns off the course preference and unsubscribes the current browser device. Other stored device endpoints remain disabled from delivery because the preference is globally off for that course.

On logout, the current browser endpoint is disabled server-side and unsubscribed before Better Auth sign-out.

## Preferences and timezone

The active course stores:

- enabled/disabled;
- preferred local reminder time;
- minimum due count.

The account's existing `User.timezone` remains the timezone source.

The Settings UI allows entering an explicit IANA zone such as:

- `Europe/Berlin`;
- `Asia/Tehran`;
- `America/Toronto`.

No geolocation or IP inference is used.

If the account still has the default `UTC` timezone, Settings shows a warning and asks the learner to correct it if needed.

DST behavior comes from `Intl.DateTimeFormat` with the persisted IANA timezone.

## Scheduler

Call:

`GET /api/cron/review-reminders`

or:

`POST /api/cron/review-reminders`

with:

`Authorization: Bearer <NOTIFICATION_CRON_SECRET>`

Recommended cadence: **every 5 minutes**.

Each run:

1. loads a bounded batch of enabled preferences;
2. requires the preference course to still be the learner's active course;
3. converts current time to the user's IANA timezone;
4. checks the 20-minute reminder window;
5. counts words genuinely due for review;
6. requires the configured minimum due count;
7. considers every active device subscription;
8. creates/reuses a per-device + type + local-date delivery row;
9. atomically claims the row before sending;
10. sends one review reminder per device;
11. records status/provider HTTP code without provider response bodies.

The unique key is:

`subscriptionId + REVIEW_REMINDER + local YYYY-MM-DD`

This makes scheduler retries idempotent.

Transient deliveries can be claimed up to three times. With a five-minute scheduler cadence, retries remain bounded inside the reminder window.

## Invalid subscriptions

Provider HTTP 404 or 410 is treated as permanently invalid.

The device subscription is marked `INVALID` and no longer selected by the scheduler.

Other provider/network failures are recorded as transient and can retry, up to the attempt limit.

## Push payload privacy

Review reminder payloads contain only:

- notification type;
- localized generic title;
- localized generic body;
- due count;
- fixed `/review` path.

They do **not** contain:

- vocabulary words;
- translations;
- review answers;
- conversation/writing/reading text;
- user identity/email;
- subscription endpoint;
- push encryption keys.

## Notification click

The service worker accepts only the known review reminder type.

Its URL is not trusted dynamically: review pushes always resolve to `/review`.

On click, it:

1. closes the notification;
2. looks for an existing same-origin U-Vocab window;
3. navigates/focuses it when available;
4. otherwise opens a new U-Vocab window.

The review page records the aggregate `review_notification_opened` analytics event.

## Analytics

Safe aggregate events:

- `notifications_enabled`;
- `notifications_disabled`;
- `review_notification_sent`;
- `review_notification_opened`.

Endpoints, auth keys, p256dh keys, and notification payload identifiers are never sent to PostHog.

Delivery does not depend on PostHog.

## Admin visibility

Admin → System shows:

- active push-device count;
- notification delivery count for the last 24 hours;
- failed delivery count for the last 24 hours.

Detailed delivery state remains in `NotificationDelivery`.

## HTTPS and browser support

Push/service workers require a secure context. Production must use HTTPS.

Chrome/Android supports standard Web Push. Safari support depends on OS/browser version and installed web-app behavior. Permission and background-delivery policies are ultimately controlled by the browser/OS.

If permission is denied, U-Vocab cannot override the browser. The learner must re-enable notifications in browser/site settings.

## Production verification

1. Deploy with valid VAPID variables and HTTPS.
2. Install/open the PWA.
3. Open Settings and enable review reminders.
4. Confirm the browser permission prompt appears only after the click.
5. Confirm one active `WebPushSubscription` exists for the device.
6. Set a reminder time within the current local scheduler window and ensure enough words are due.
7. Call the cron endpoint with the secret.
8. Confirm one delivery row and one system notification.
9. Re-run cron and confirm the same device/day reminder is not duplicated.
10. Click the notification and confirm U-Vocab focuses/opens `/review`.
11. Sign out and confirm the device subscription is disabled/unsubscribed.
12. Test a deliberately expired subscription and confirm 404/410 marks it invalid.
