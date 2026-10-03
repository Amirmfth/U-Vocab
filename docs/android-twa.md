# Android Trusted Web Activity

U-Vocab's Android package is a thin Trusted Web Activity (TWA) around the production PWA. Authentication, learner state, localization, subscriptions, AI features, offline behavior, and review reminders remain web-owned.

## Production identity

- Android application ID: `ir.uvocab.app`
- App name: `U-Vocab`
- Production origin: `https://uvocab.ir`
- Start URL: `/`
- Web manifest: `https://uvocab.ir/manifest.webmanifest`
- TWA tooling: `@bubblewrap/cli 1.25.0`
- Initial version: `1.0.0`
- Initial versionCode: `1`

Treat the application ID as permanent once distributed.

Version releases use:

```bash
npm run android:version -- patch
npm run android:version -- minor
npm run android:version -- major
```

Every version change increments `appVersionCode`.

## Digital Asset Links

Trusted fullscreen TWA mode depends on bidirectional Digital Asset Links verification. If verification fails, Chrome falls back to browser/Custom Tab UI; that is not considered a production-ready verified TWA.

U-Vocab serves:

`https://uvocab.ir/.well-known/assetlinks.json`

Configure the SHA-256 signing fingerprints in production:

```env
ANDROID_TWA_SHA256_FINGERPRINTS="AA:BB:...:FF"
```

Multiple fingerprints can be comma-separated when both direct-distribution and Play App Signing certificates must be trusted.

The production certificate fingerprint must be the certificate that actually signs the installed package. For Google Play distribution, this is normally the **Play App Signing certificate**, not merely the local upload key.

Do not put private keys or keystores in this environment variable; only public SHA-256 certificate fingerprints belong here.

### Verify the installed signer

For a signed APK:

```bash
keytool -printcert -jarfile app-release-signed.apk
```

For Play distribution, obtain the App Signing certificate fingerprint from Play Console → App integrity.

Then confirm the deployed endpoint returns the same fingerprint and package ID:

```text
ir.uvocab.app
delegate_permission/common.handle_all_urls
```

Android/Chrome verification can also be inspected with:

```bash
adb logcat -v brief | grep -E 'OriginVerifier|digital_asset_links'
adb logcat -v brief | grep TWAProviderPicker
```

A visible browser toolbar after launch is a verification failure to investigate, not an acceptable release state.

## Signing

The repository intentionally contains no release keystore.

The Bubblewrap source manifest references:

`android/release.keystore`

That path is ignored by Git.

Never commit:

- release/upload keystore;
- keystore password;
- key password;
- Play service account credentials.

For local release builds, create or securely obtain the production upload key outside Git and place/copy it at the ignored path only while building.

CI release signing uses repository/environment secrets.

## Local Android builds

Requirements:

- Node.js supported by the repository;
- JDK 17;
- Android SDK;
- Bubblewrap dependencies installed with `npm ci`.

Update/regenerate the Bubblewrap project after changing `android/twa-manifest.json`:

```bash
npm run android:update
```

Build an unsigned Android package where appropriate:

```bash
npm run android:build:unsigned
```

For the committed Gradle project, a local debug APK can be produced with:

```bash
cd android
./gradlew assembleDebug
```

The APK is under `android/app/build/outputs/apk/debug/`.

Install with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Debug-signed APKs use a different certificate from Play/release packages. If you need debug builds to run as a verified TWA, add the debug certificate fingerprint to the **test/staging** origin's DAL configuration. Do not casually weaken production DAL for local testing.

## Release APK and AAB

The Android CI workflow always builds a debug/test APK without signing secrets.

Release artifacts are only produced when explicitly requested and signing secrets are available.

Expected CI secrets:

- `ANDROID_RELEASE_KEYSTORE_BASE64`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEYSTORE_PASSWORD`
- `ANDROID_RELEASE_KEY_PASSWORD`

The workflow reconstructs the keystore only in the runner workspace and deletes it with the ephemeral runner.

Before publishing release artifacts, CI extracts the SHA-256 fingerprint from the exact release keystore and checks the deployed `https://uvocab.ir/.well-known/assetlinks.json`. The release job fails if the production origin does not trust `ir.uvocab.app` with that signer. This prevents accidentally shipping a package that falls back to browser/custom-tab UI because DAL configuration is stale.

For a Play App Signing release, remember that Google re-signs the uploaded bundle. The production DAL must additionally contain the **Play App Signing** certificate fingerprint from Play Console; verify a Play-installed build separately before production rollout.

For Google Play, the primary store artifact is the signed Android App Bundle (AAB). A signed APK may additionally be produced for direct internal distribution where needed.

Normal Next.js CI does not require any Android signing secret.

## Staging

Do not point a staging wrapper at production using the production package identity.

Use:

- application ID: `ir.uvocab.app.staging`;
- origin: `https://staging.uvocab.ir`;
- a separate signing identity/fingerprint;
- DAL hosted by the staging origin.

`android/twa-manifest.staging.example.json` documents this separation.

This prevents staging certificates/origins from weakening production trust.

## TWA behavior checklist

Before release, verify on a physical Android device with current Chrome:

### Trusted launch

- launch from the Android icon;
- no Chrome/browser toolbar appears;
- URL remains under `https://uvocab.ir`;
- internal app links stay in the trusted experience.

External/untrusted origins should open through normal browser/custom-tab behavior rather than becoming implicitly trusted.

### Navigation

Verify:

- Android Back navigates web history naturally;
- closing/back from the root exits normally;
- direct links such as `/review`, `/vocabulary`, and Settings remain in the TWA;
- notification deep links from #104 open/focus `/review`.

### Authentication

Authentication is Better Auth/web-session based.

Verify:

- login completes inside the trusted origin;
- session cookies persist between TWA launches;
- logout clears the current push subscription and session as implemented by the PWA;
- account switching does not inherit another user's notification subscription.

No native authentication copy is implemented.

### EN/FA / RTL

Switch U-Vocab to Persian and verify:

- page direction is RTL;
- bottom navigation and settings remain usable;
- Android system bars do not obscure content;
- launcher/TWA itself does not force LTR.

### Offline/update behavior

The TWA loads the same PWA/service worker as Chrome.

Verify:

- offline navigation shows U-Vocab's localized offline shell;
- cached private/account data is not introduced by the Android wrapper;
- service-worker update prompt still appears;
- unsaved forms still block forced update reloads.

## Notifications

Bubblewrap notification delegation is enabled with:

```json
"enableNotifications": true
```

This is intended to preserve the standards-based Web Push implementation from issue #104 rather than introducing Firebase/native push as a second backend.

Verify after DAL trust is established:

1. enable review reminders inside Settings;
2. accept the Android/Chrome notification permission when requested;
3. run the review-reminder scheduler;
4. receive the Web Push notification;
5. tap it and confirm `/review` opens/focuses.

Android/Chrome notification permission behavior varies by Android/Chrome version. Keep the explicit learner opt-in from the web app; do not add an unsolicited native permission prompt.

## Microphone and other permissions

The TWA requests web-origin permissions through Chrome.

Do not add contacts, location, storage, camera, or other native Android permissions unless a real product capability requires them.

When voice/microphone input is shipped, test microphone permission from the TWA on supported Android/Chrome versions. The current wrapper does not add a native JavaScript bridge or custom permission layer.

Location delegation is explicitly disabled.

## Security

The Android wrapper:

- trusts only the configured production origin;
- has no arbitrary WebView JavaScript bridge;
- contains no U-Vocab API keys;
- contains no database/auth/AI secrets;
- contains no signing credential in Git;
- leaves business/auth/localization logic in the web application.

## Google Play release checklist

Before a production Play release:

- confirm package ID `ir.uvocab.app`;
- enroll/configure Play App Signing;
- configure production DAL with the **Play App Signing** SHA-256 fingerprint;
- verify trusted fullscreen launch from a Play-installed build;
- review the current target SDK deadline and regenerate/update Bubblewrap if needed;
- bump `appVersion` / `appVersionCode`;
- build and inspect the signed AAB;
- provide privacy policy URL;
- complete/review Data Safety declarations against actual U-Vocab behavior;
- prepare screenshots, icon, feature graphic, description, content rating, and support contact;
- test EN/FA, authentication, offline behavior, notifications, links, and account switching;
- verify no debug/staging endpoint or signing fingerprint is present in production configuration.

## Digital subscriptions / Play Billing

U-Vocab's Pro plan is a digital feature.

The Android manifest intentionally keeps Bubblewrap Play Billing disabled:

```json
"playBilling": { "enabled": false }
```

Do **not** expose or hardwire a web checkout inside the Play-distributed TWA until the current Google Play payments policy and any applicable country/program exceptions have been reviewed for the release.

If Play Billing or the Digital Goods API becomes necessary, implement it as an adapter into U-Vocab's provider-neutral subscription/entitlement service from issue #100. Android billing must not create a second source of entitlement truth.

Direct-install/test APK packaging is separate from the decision about how purchases are offered in a Play-distributed build.

## Release responsibility

The repository can make the wrapper and builds reproducible, but final production DAL verification necessarily requires the real release/Play signing certificate. Do not mark the Play package verified until an actual signed installed build has been tested against the deployed `assetlinks.json`.
