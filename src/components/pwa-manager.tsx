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
        <div className="pwa-connectivity fixed uv-z-index-b888b29826 uv-top-95733511cd uv-left-b46da6ec37 uv-transform-9fc1c118d6 inline-flex items-center gap-2 uv-max-width-d2dbda58ca uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-red9ab892c5 bg-uv-cec7f8cbea6 text-uv-text-soft uv-box-shadow-4ee177db8b text-uv-f5f68d82942" role="status">
          <WifiOff size={15} />
          <span>{t("pwa.offlineBanner")}</span>
        </div>
      ) : null}

      {waiting ? (
        <aside className="pwa-update fixed uv-z-index-2d0c8af807 uv-inset-4ef3e57216 flex items-center justify-between gap-3 max-w-uv-438408eab5 mx-auto p-3.5 uv-border-488f4b382f rounded-uv-r6d27d54c6c bg-uv-cfc0f1d21e4 uv-box-shadow-4ee177db8b uv-backdrop-filter-ee1e0ecb9e uv-vcbb57f4d35:grid uv-vcbb57f4d35:gap-0.75 uv-vcbb57f4d35:min-w-0 uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:text-uv-f5f68d82942 uv-v36c0309a03:uv-line-height-a26f83404b uv-vcded88c612:w-auto uv-vcded88c612:min-w-31 uv-min900:uv-inset-inline-d4d626e5fe uv-min900:bottom-6 uv-min900:uv-width-e83f4f51d7 uv-min900:m-0 uv-max560:items-stretch uv-max560:flex-col" role="status" aria-live="polite">
          <div>
            <strong>{t("pwa.updateTitle")}</strong>
            <span>{dirty ? t("pwa.updateUnsaved") : t("pwa.updateBody")}</span>
          </div>
          <button
            type="button"
            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
            onClick={applyUpdate}
            disabled={dirty}
          >
            <RefreshCw size={16} />
            {t("pwa.updateAction")}
          </button>
        </aside>
      ) : null}

      {installPrompt ? (
        <aside className="pwa-install fixed uv-z-index-2d0c8af807 uv-inset-4ef3e57216 flex items-center justify-between gap-3 max-w-uv-438408eab5 mx-auto p-3.5 uv-border-488f4b382f rounded-uv-r6d27d54c6c bg-uv-cfc0f1d21e4 uv-box-shadow-4ee177db8b uv-backdrop-filter-ee1e0ecb9e uv-v0fee2d502c:grid uv-v0fee2d502c:gap-0.75 uv-v0fee2d502c:min-w-0 uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:text-uv-f5f68d82942 uv-v36c0309a03:uv-line-height-a26f83404b uv-vcded88c612:w-auto uv-vcded88c612:min-w-31 uv-min900:uv-inset-inline-d4d626e5fe uv-min900:bottom-6 uv-min900:uv-width-e83f4f51d7 uv-min900:m-0 uv-max560:items-stretch uv-max560:flex-col" aria-label={t("pwa.installTitle")}>
          <div>
            <strong>{t("pwa.installTitle")}</strong>
            <span>{t("pwa.installBody")}</span>
          </div>
          <div className="pwa-install-actions flex gap-2 items-center uv-max560:uv-vcded88c612:uv-flex-356a192b79">
            <button type="button" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" onClick={install}>
              <Download size={16} />
              {t("pwa.installAction")}
            </button>
            <button
              type="button"
              className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383"
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
