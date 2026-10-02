# U-Vocab PWA

U-Vocab is an installable Progressive Web App intended to remain compatible with a later Android Trusted Web Activity (TWA).

The implementation uses **Serwist 9.5.12** with Next.js. It deliberately favors privacy and correctness over broad offline caching.

## Production identity

Canonical production origin:

`https://uvocab.ir/`

The web manifest uses this origin as its stable app `id`, with:

- `start_url: /`;
- `scope: /`;
- `display: standalone`;
- U-Vocab dark theme/background colors;
- 192×192 launcher icon;
- 512×512 launcher icon;
- separate 512×512 maskable icon;
- 180×180 Apple touch icon.

The manifest itself is canonical English metadata. Runtime UI and the offline experience remain localized EN/FA. A per-user manifest is intentionally not used because install identity should remain stable for browsers and the future TWA.

## Cache strategy

The service worker does **not** use Serwist's broad default runtime cache.

### Runtime-cached

Only same-origin static resources:

- `/_next/static/*` — cache-first, release-versioned cache;
- `/fonts/*` — cache-first;
- `/pwa/*` — cache-first;
- `/manifest.webmanifest` — cache-first.

Caches are bounded by entry count and age.

### Never runtime-cached by this issue

Document navigations are network-only.

API routes are not cached.

This means U-Vocab does not persistently runtime-cache:

- authenticated page HTML;
- vocabulary/review data;
- account/subscription/admin pages;
- conversation/writing/reading data;
- auth/session endpoints;
- AI responses;
- POST mutations.

Build-time precaching contains versioned application assets plus the static `offline.html` fallback; it is not a cache of user account state.

## Offline behavior

When a document navigation fails because the network is unavailable, the service worker returns `/offline.html`.

The fallback:

- detects Persian browser language and switches to FA/RTL;
- otherwise displays English;
- states that account/AI/review/sync actions require connectivity;
- does not claim that learning changes can synchronize offline;
- explains that private learning data is not in the shared offline cache.

When the currently loaded app loses connectivity, a localized connectivity banner is also shown.

No background review queue or mutation replay is implemented in this issue.

## Service-worker updates

`skipWaiting` is disabled.

When a new worker reaches the waiting state, U-Vocab shows a localized **Update available** control.

The application tracks edits to form inputs. While any form is dirty:

- the update action is disabled;
- the user is told to finish/save the form first;
- a service-worker controller change does not force a reload.

Once the user explicitly applies the update, the waiting worker receives `UVOCAB_SKIP_WAITING`; after activation the page reloads into the new build.

Old release-specific runtime caches are removed during service-worker activation.

## Emergency cache invalidation

Runtime cache names contain the release ID. A deployment with a new release automatically uses new cache buckets and removes obsolete U-Vocab runtime caches on activation.

For an immediate client-side cleanup, logout sends `UVOCAB_CLEAR_RUNTIME_CACHES` and deletes the U-Vocab runtime cache names through the Cache Storage API.

If a production incident requires stronger invalidation, deploy a new release and change the cache prefix/version in `src/app/sw.ts`. Do not broaden cache deletion to unrelated origin caches without reviewing other applications on the same origin.

## Logout and account switching

Before Better Auth signs the user out, U-Vocab clears the runtime caches introduced by this PWA.

These caches contain static assets only, not user data, but explicit cleanup prevents future PWA work from accidentally creating cross-account persistence through these buckets.

PostHog identity reset remains separate and also occurs before sign-out.

## Install UX

The native `beforeinstallprompt` event is captured only when the browser offers it.

The in-app suggestion:

- is not shown in standalone mode;
- can be dismissed;
- stays dismissed for 30 days;
- uses the native browser installation prompt;
- records only safe install lifecycle events through the existing product analytics abstraction.

Browsers that do not expose `beforeinstallprompt` continue to use their native installation UI.

## Local testing

Service workers require a secure context. Browsers treat `localhost` as secure for development, but a production-like test should use HTTPS.

Recommended validation:

1. Run a production build, not only `next dev`.
2. Serve it locally with `npm start`.
3. Open Chrome DevTools → Application.
4. Confirm the manifest resolves and the 192/512/maskable icons are recognized.
5. Confirm `/sw.js` is registered with scope `/`.
6. Install the application and launch it in standalone mode.
7. Switch DevTools Network to Offline and navigate: the localized offline shell should appear.
8. Return online and confirm account-backed pages fetch fresh data.
9. Deploy another release and verify the update banner appears.
10. Enter text in a form and confirm the update button is disabled until the form is submitted/reloaded.
11. Sign out and inspect Cache Storage: U-Vocab runtime static caches should be removed.
12. Repeat in Persian and confirm RTL/layout behavior in standalone mode.

## Chrome / Android production verification

On `https://uvocab.ir`:

- verify HTTPS and no mixed content;
- verify manifest `id`, `scope`, and `start_url` all remain on the production origin;
- install from Chrome on Android;
- verify launcher and maskable icon cropping;
- verify standalone launch;
- verify safe-area padding around display cutouts/navigation areas;
- test EN and FA/RTL;
- inspect Cache Storage and confirm no authenticated/API responses appear in U-Vocab runtime caches.

Lighthouse/PWA diagnostics can be used as one signal, but manual cache/privacy/update checks remain required.

## TWA assumptions

The future TWA should use:

- origin: `https://uvocab.ir`;
- scope/start URL: `/`;
- stable manifest ID: `https://uvocab.ir/`.

Do not change the manifest ID casually after distributing an Android wrapper; treat it as application identity.
