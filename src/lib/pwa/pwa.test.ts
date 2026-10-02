import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("manifest has stable TWA-ready identity and production icons", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.id, "https://uvocab.ir/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#09090b");
  assert.ok(manifest.icons.some((icon: { sizes: string }) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon: { sizes: string }) => icon.sizes === "512x512"));
  assert.ok(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable"));
});

test("service worker never runtime-caches document navigation or API data", () => {
  const sw = read("src/app/sw.ts");
  assert.match(sw, /request\.mode === "navigate"[\s\S]*new NetworkOnly/);
  assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);
  assert.equal(sw.includes("NetworkFirst"), false);
  assert.equal(sw.includes("StaleWhileRevalidate"), false);
  assert.match(sw, /pathname\.startsWith\("\/_next\/static\/"\)/);
  assert.match(sw, /pathname\.startsWith\("\/fonts\/"\)/);
  assert.match(sw, /pathname\.startsWith\("\/pwa\/"\)/);
});

test("offline fallback is localized and does not claim offline sync", () => {
  const offline = read("public/offline.html");
  assert.match(offline, /You’re offline/);
  assert.match(offline, /آفلاین هستید/);
  assert.match(offline, /Private learning data is not stored/);
  assert.equal(offline.toLowerCase().includes("offline sync"), false);
});

test("service-worker updates require explicit activation and protect unsaved forms", () => {
  const sw = read("src/app/sw.ts");
  const manager = read("src/components/pwa-manager.tsx");
  assert.match(sw, /skipWaiting: false/);
  assert.match(sw, /UVOCAB_SKIP_WAITING/);
  assert.match(manager, /disabled=\{dirty\}/);
  assert.match(manager, /controllerchange/);
  assert.match(manager, /if \(reloadingForUpdate\.current && !dirty\)/);
});

test("logout clears PWA runtime caches before account sign-out", () => {
  const signOut = read("src/app/settings/SignOutButton.tsx");
  const clearIndex = signOut.indexOf("clearPwaRuntimeCaches()");
  const signOutIndex = signOut.indexOf("authClient.signOut()");
  assert.ok(clearIndex >= 0);
  assert.ok(signOutIndex > clearIndex);
});

test("install prompting has cooldown and analytics hooks", () => {
  const manager = read("src/components/pwa-manager.tsx");
  const events = read("src/lib/analytics/events.ts");
  assert.match(manager, /INSTALL_COOLDOWN_MS = 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(manager, /beforeinstallprompt/);
  assert.match(manager, /appinstalled/);
  for (const name of [
    "pwa_install_prompt_available",
    "pwa_install_prompt_result",
    "pwa_installed",
  ]) {
    assert.ok(events.includes(name));
  }
});

test("Next metadata connects manifest, mobile icons, and safe-area viewport", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /appleWebApp/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /<PwaManager \/>/);
});

test("PWA lifecycle messages exist in both English and Persian", () => {
  const en = read("src/i18n/en.ts");
  const fa = read("src/i18n/fa.ts");
  for (const key of [
    "pwa.offlineBanner",
    "pwa.updateTitle",
    "pwa.updateUnsaved",
    "pwa.updateAction",
    "pwa.installTitle",
    "pwa.installAction",
  ]) {
    assert.ok(en.includes(key), "English missing " + key);
    assert.ok(fa.includes(key), "Persian missing " + key);
  }
});
