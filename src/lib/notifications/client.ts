"use client";

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readyPushRegistration() {
  return withTimeout(
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(
      () => navigator.serviceWorker.ready,
    ),
    15000,
    "The notification service worker did not become ready. Reload and try again.",
  );
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeCurrentDevice(publicKey: string) {
  if (!pushSupported()) throw new Error("Push notifications are not supported.");
  const registration = await readyPushRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }),
    30000,
    "The browser did not complete push subscription. Try again.",
  );
}

export async function registerSubscriptionWithServer(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const response = await fetch("/api/notifications/subscription", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: json.keys,
      deviceLabel: navigator.platform || null,
    }),
  });
  if (!response.ok) throw new Error("Could not save push subscription.");
}

export async function disableCurrentPushDeviceForLogout() {
  try {
    const subscription = await currentPushSubscription();
    if (!subscription) return;
    await fetch("/api/notifications/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      keepalive: true,
    });
    await subscription.unsubscribe();
  } catch {
    // Logout must continue even if browser push cleanup is unavailable.
  }
}
