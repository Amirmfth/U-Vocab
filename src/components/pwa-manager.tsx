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
        <div className="pwa-connectivity fixed z-index-80 top-max-10px-env-safe-area-inset-top left-50pct transform-translatex-50pct inline-flex items-center gap-2 max-width-calc-100vw-24px padding-8px-12px border-1px-solid-border-2 rounded-uv-red9ab892c5 bg-uv-cec7f8cbea6 text-uv-text-soft box-shadow-shadow text-uv-f5f68d82942" role="status">
          <WifiOff size={15} />
          <span>{t("pwa.offlineBanner")}</span>
        </div>
      ) : null}

      {waiting ? (
        <aside className="pwa-update fixed z-index-90 inset-auto-12px-calc-86px-env-safe-area-inset-bottom-12px flex items-center justify-between gap-3 max-w-uv-438408eab5 mx-auto p-3.5 border-1px-solid-border-strong rounded-uv-r6d27d54c6c bg-uv-cfc0f1d21e4 box-shadow-shadow backdrop-filter-blur-18px in-div:grid in-div:gap-0.75 in-div:min-w-0 in-span:text-uv-text-soft in-span:text-uv-f5f68d82942 in-span:line-height-1p4 in-button-2:w-auto in-button-2:min-w-31 uv-min900:inset-inline-auto-24px uv-min900:bottom-6 uv-min900:width-min-520px-calc-100vw-48px uv-min900:m-0 uv-max560:items-stretch uv-max560:flex-col" role="status" aria-live="polite">
          <div>
            <strong>{t("pwa.updateTitle")}</strong>
            <span>{dirty ? t("pwa.updateUnsaved") : t("pwa.updateBody")}</span>
          </div>
          <button
            type="button"
            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
            onClick={applyUpdate}
            disabled={dirty}
          >
            <RefreshCw size={16} />
            {t("pwa.updateAction")}
          </button>
        </aside>
      ) : null}

      {installPrompt ? (
        <aside className="pwa-install fixed z-index-90 inset-auto-12px-calc-86px-env-safe-area-inset-bottom-12px flex items-center justify-between gap-3 max-w-uv-438408eab5 mx-auto p-3.5 border-1px-solid-border-strong rounded-uv-r6d27d54c6c bg-uv-cfc0f1d21e4 box-shadow-shadow backdrop-filter-blur-18px in-div-first-child:grid in-div-first-child:gap-0.75 in-div-first-child:min-w-0 in-span:text-uv-text-soft in-span:text-uv-f5f68d82942 in-span:line-height-1p4 in-button-2:w-auto in-button-2:min-w-31 uv-min900:inset-inline-auto-24px uv-min900:bottom-6 uv-min900:width-min-520px-calc-100vw-48px uv-min900:m-0 uv-max560:items-stretch uv-max560:flex-col" aria-label={t("pwa.installTitle")}>
          <div>
            <strong>{t("pwa.installTitle")}</strong>
            <span>{t("pwa.installBody")}</span>
          </div>
          <div className="pwa-install-actions flex gap-2 items-center uv-max560:in-button-2:flex-1">
            <button type="button" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" onClick={install}>
              <Download size={16} />
              {t("pwa.installAction")}
            </button>
            <button
              type="button"
              className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft min-height-tap-target"
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
