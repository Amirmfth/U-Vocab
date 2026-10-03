import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { reviewReminderPayload } from "./payload";
import { withinReminderWindow } from "./time";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("review payload is minimal and contains no learner content", () => {
  const payload = reviewReminderPayload({ locale: "EN", dueCount: 12 });
  assert.deepEqual(Object.keys(payload).sort(), ["body", "dueCount", "title", "type", "url"].sort());
  assert.equal(payload.url, "/review");
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const forbidden of ["lemma", "vocabulary", "conversation", "draft", "email", "endpoint", "p256dh", "auth"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("timezone reminder windows use IANA local time", () => {
  const now = new Date("2026-10-02T14:30:00Z");
  const tehran = withinReminderWindow({
    now,
    timeZone: "Asia/Tehran",
    reminderMinuteOfDay: 18 * 60,
    windowMinutes: 20,
  });
  assert.equal(tehran.eligible, true);
  assert.equal(tehran.bucketKey, "2026-10-02");

  const berlin = withinReminderWindow({
    now,
    timeZone: "Europe/Berlin",
    reminderMinuteOfDay: 18 * 60,
    windowMinutes: 20,
  });
  assert.equal(berlin.eligible, false);
});

test("subscription registration supports multiple devices with unique endpoints", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model WebPushSubscription/);
  assert.match(schema, /endpoint\s+String\s+@unique/);
  assert.match(schema, /pushSubscriptions\s+WebPushSubscription\[\]/);
  const scheduler = read("src/lib/notifications/review-reminder-job.ts");
  assert.match(scheduler, /for \(const subscription of preference\.user\.pushSubscriptions\)/);
});

test("preference disable is persisted independently from browser permission", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model ReviewNotificationPreference/);
  assert.match(schema, /enabled\s+Boolean\s+@default\(false\)/);
  const api = read("src/app/api/notifications/preferences/route.ts");
  assert.match(api, /enabled: nextEnabled|enabled,/);
});

test("scheduler checks due count and minimum threshold", () => {
  const scheduler = read("src/lib/notifications/review-reminder-job.ts");
  assert.match(scheduler, /db\.userVocabulary\.count/);
  assert.match(scheduler, /dueCount < preference\.minimumDueCount/);
  assert.match(scheduler, /nextReviewAt/);
});

test("delivery ledger makes cron retries idempotent and bounded", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /@@unique\(\[subscriptionId, type, bucketKey\]\)/);
  const scheduler = read("src/lib/notifications/review-reminder-job.ts");
  assert.match(scheduler, /MAX_ATTEMPTS = 3/);
  assert.match(scheduler, /status: NotificationDeliveryStatus\.PROCESSING/);
  assert.match(scheduler, /attemptCount: \{ increment: 1 \}/);
});

test("permanently invalid push endpoints are disabled", () => {
  const sender = read("src/lib/notifications/web-push.ts");
  assert.match(sender, /statusCode === 404 \|\| statusCode === 410/);
  assert.match(sender, /PushSubscriptionStatus\.INVALID/);
});

test("service worker focuses or opens review on notification click", () => {
  const sw = read("src/app/sw.ts");
  assert.match(sw, /notificationclick/);
  assert.match(sw, /\/review\?notification=review_reminder/);
  assert.match(sw, /clients\.matchAll/);
  assert.match(sw, /client\.focus/);
  assert.match(sw, /openWindow/);
});

test("notification permission is requested only from explicit enable action", () => {
  const settings = read("src/app/settings/ReviewReminderSettings.tsx");
  const requestIndex = settings.indexOf("Notification.requestPermission()");
  const enableIndex = settings.indexOf("const enable = async");
  assert.ok(enableIndex >= 0 && requestIndex > enableIndex);
  assert.equal(read("src/app/layout.tsx").includes("Notification.requestPermission"), false);
});

test("VAPID private key stays server-only", () => {
  const env = read(".env.example");
  assert.match(env, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.match(env, /VAPID_PRIVATE_KEY/);
  assert.equal(env.includes("NEXT_PUBLIC_VAPID_PRIVATE_KEY"), false);
  const client = read("src/app/settings/ReviewReminderSettings.tsx");
  assert.equal(client.includes("VAPID_PRIVATE_KEY"), false);
});
