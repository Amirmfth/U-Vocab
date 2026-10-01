"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { captureProductEvent } from "@/lib/analytics/client";
import { useTranslations } from "@/i18n/client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISS_KEY = "uvocab:pwa-install-dismissed-at";
const INSTALL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function hasRecentInstallDismissal() {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
    return raw ? Date.now() - Number(raw) < INSTALL_COOLDOWN_MS : false;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function clearPwaRuntimeCaches() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    const worker = registration.active ?? registration.waiting;
    worker?.postMessage({ type: "UVOCAB_CLEAR_RUNTIME_CACHES" });
  }
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("uvocab-static-") || name.startsWith("uvocab-fonts-"))
        .map((name) => caches.delete(name)),
    );
  }
}

export function PwaManager() {
  const t = useTranslations();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [dirty, setDirty] = useState(false);
  const reloadingForUpdate = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let cancelled = false;

    const watchInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller &&
          registration?.waiting
        ) {
          setWaiting(registration.waiting);
        }
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registered) => {
        if (cancelled) return;
        registration = registered;
        if (registered.waiting && navigator.serviceWorker.controller) {
          setWaiting(registered.waiting);
        }
        watchInstalling(registered.installing);
        registered.addEventListener("updatefound", () => {
          watchInstalling(registered.installing);
        });
        void registered.update();
      })
      .catch(() => {
        // PWA support is progressive; app use must not depend on registration.
      });

    const handleControllerChange = () => {
      if (reloadingForUpdate.current && !dirty) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [dirty]);

  useEffect(() => {
    const handleInput = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        if (target.closest("form")) setDirty(true);
      }
    };
    const handleSubmit = () => setDirty(false);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      if (isStandalone() || hasRecentInstallDismissal()) return;
      setInstallPrompt(event as InstallPromptEvent);
      captureProductEvent("pwa_install_prompt_available", { surface: "app" });
    };
    const installed = () => {
      setInstallPrompt(null);
      captureProductEvent("pwa_installed", { surface: "browser" });
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const applyUpdate = () => {
    if (!waiting || dirty) return;
    reloadingForUpdate.current = true;
    waiting.postMessage({ type: "UVOCAB_SKIP_WAITING" });
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    captureProductEvent("pwa_install_prompt_result", {
      surface: "app",
      outcome: choice.outcome,
    });
    if (choice.outcome === "dismissed") {
      try {
        localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
      } catch {}
    }
    setInstallPrompt(null);
  };

  return (
    <>
      {offline ? (
        <div className="pwa-connectivity" role="status">
          <WifiOff size={15} />
          <span>{t("pwa.offlineBanner")}</span>
        </div>
      ) : null}

      {waiting ? (
        <aside className="pwa-update" role="status" aria-live="polite">
          <div>
            <strong>{t("pwa.updateTitle")}</strong>
            <span>{dirty ? t("pwa.updateUnsaved") : t("pwa.updateBody")}</span>
          </div>
          <button
            type="button"
            className="button button-primary"
            onClick={applyUpdate}
            disabled={dirty}
          >
            <RefreshCw size={16} />
            {t("pwa.updateAction")}
          </button>
        </aside>
      ) : null}

      {installPrompt ? (
        <aside className="pwa-install" aria-label={t("pwa.installTitle")}>
          <div>
            <strong>{t("pwa.installTitle")}</strong>
            <span>{t("pwa.installBody")}</span>
          </div>
          <div className="pwa-install-actions">
            <button type="button" className="button button-primary" onClick={install}>
              <Download size={16} />
              {t("pwa.installAction")}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t("pwa.installDismiss")}
              onClick={() => {
                try {
                  localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
                } catch {}
                setInstallPrompt(null);
              }}
            >
              <X size={17} />
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
