import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("production TWA identity is stable and production-only", () => {
  const manifest = JSON.parse(read("android/twa-manifest.json"));
  assert.equal(manifest.packageId, "ir.uvocab.app");
  assert.equal(manifest.host, "uvocab.ir");
  assert.equal(manifest.startUrl, "/");
  assert.equal(manifest.webManifestUrl, "https://uvocab.ir/manifest.webmanifest");
  assert.equal(manifest.fallbackType, "customtabs");
  assert.deepEqual(manifest.additionalTrustedOrigins, []);
  assert.equal(manifest.appVersion, "1.0.0");
  assert.equal(manifest.appVersionCode, 1);
});

test("TWA delegates notifications but does not enable Play billing or location", () => {
  const manifest = JSON.parse(read("android/twa-manifest.json"));
  assert.equal(manifest.enableNotifications, true);
  assert.equal(manifest.features.playBilling.enabled, false);
  assert.equal(manifest.features.locationDelegation.enabled, false);
});

test("Digital Asset Links only trusts the production Android package and configured certificates", () => {
  const route = read("src/app/.well-known/assetlinks.json/route.ts");
  assert.match(route, /ir\.uvocab\.app/);
  assert.match(route, /delegate_permission\/common\.handle_all_urls/);
  assert.match(route, /ANDROID_TWA_SHA256_FINGERPRINTS/);
  assert.equal(route.includes("PRIVATE"), false);
});

test("Android signing files and artifacts are excluded from git", () => {
  const ignore = read(".gitignore");
  for (const value of [
    "android/*.keystore",
    "android/*.jks",
    "android/*.p12",
    "android/*.apk",
    "android/*.aab",
  ]) {
    assert.ok(ignore.includes(value), "missing ignore rule " + value);
  }
});

test("staging uses a separate origin and application id", () => {
  const prod = JSON.parse(read("android/twa-manifest.json"));
  const staging = JSON.parse(read("android/twa-manifest.staging.example.json"));
  assert.notEqual(staging.packageId, prod.packageId);
  assert.notEqual(staging.host, prod.host);
  assert.match(staging.packageId, /\.staging$/);
  assert.equal(staging.features.playBilling.enabled, false);
});

test("Android version script increments both semantic version and versionCode", () => {
  const script = read("scripts/bump-android-version.ts");
  assert.match(script, /manifest\.appVersionCode \+= 1/);
  assert.match(script, /major\.minor\.patch/);
});

test("TWA is not implemented as a WebView wrapper", () => {
  const manifest = read("android/twa-manifest.json");
  assert.equal(manifest.includes("WebView"), false);
  const packageJson = read("package.json");
  assert.match(packageJson, /@bubblewrap\/cli/);
});

test("Play Billing remains intentionally disabled pending policy-compliant checkout work", () => {
  const manifest = JSON.parse(read("android/twa-manifest.json"));
  assert.equal(manifest.features.playBilling.enabled, false);
  const docs = read("docs/android-twa.md");
  assert.match(docs, /Play Billing/i);
  assert.match(docs, /provider-neutral/i);
});
