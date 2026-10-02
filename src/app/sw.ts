import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const RELEASE =
  process.env.NEXT_PUBLIC_APP_RELEASE ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  "development";

const STATIC_CACHE = "uvocab-static-" + RELEASE;
const FONT_CACHE = "uvocab-fonts-" + RELEASE;
const PWA_CACHE_PREFIXES = ["uvocab-static-", "uvocab-fonts-"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        request.method === "GET" &&
        new URL(request.url).pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: STATIC_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 180,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) => {
        if (!sameOrigin || request.method !== "GET") return false;
        const pathname = new URL(request.url).pathname;
        return (
          pathname.startsWith("/fonts/") ||
          pathname.startsWith("/pwa/") ||
          pathname === "/manifest.webmanifest"
        );
      },
      handler: new CacheFirst({
        cacheName: FONT_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 40,
            maxAgeSeconds: 60 * 60 * 24 * 90,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (new URL(request.url).pathname.startsWith("/api/") ||
          request.method !== "GET"),
      handler: new NetworkOnly(),
      method: "GET",
    },
  ],
});

serwist.setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate" || request.destination === "document") {
    return (await serwist.matchPrecache("/offline.html")) ?? Response.error();
  }
  return Response.error();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "UVOCAB_SKIP_WAITING") {
    void self.skipWaiting();
  }
  if (event.data?.type === "UVOCAB_CLEAR_RUNTIME_CACHES") {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => PWA_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name)),
        ),
      ),
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter(
            (name) =>
              PWA_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
              name !== STATIC_CACHE &&
              name !== FONT_CACHE,
          )
          .map((name) => caches.delete(name)),
      ),
    ),
  );
});


self.addEventListener("push", (event) => {
  let payload: {
    type?: string;
    title?: string;
    body?: string;
    dueCount?: number;
    url?: string;
  } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }

  if (payload.type !== "review_reminder") return;
  const url = payload.url === "/review" ? "/review" : "/review";
  const title = typeof payload.title === "string" ? payload.title.slice(0, 80) : "U-Vocab review";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 180) : "Words are ready for review.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      tag: "uvocab-review-reminder",
      renotify: false,
      data: { url, type: "review_reminder" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  if (event.notification.data?.type !== "review_reminder") return;
  event.notification.close();
  const targetPath = "/review?notification=review_reminder";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.origin !== self.location.origin) continue;
        await client.navigate(targetPath);
        return client.focus();
      }
      return self.clients.openWindow?.(targetPath);
    }),
  );
});

serwist.addEventListeners();
