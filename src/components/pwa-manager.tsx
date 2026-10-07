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
        <div className="pwa-connectivity [position:fixed] [z-index:80] [top:max(10px,_env(safe-area-inset-top))] [left:50%] [transform:translateX(-50%)] [display:inline-flex] [align-items:center] [gap:8px] [max-width:calc(100vw_-_24px)] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:999px] [background:rgba(17,17,20,.96)] [color:var(--text-soft)] [box-shadow:var(--shadow)] [font-size:.78rem]" role="status">
          <WifiOff size={15} />
          <span>{t("pwa.offlineBanner")}</span>
        </div>
      ) : null}

      {waiting ? (
        <aside className="pwa-update [position:fixed] [z-index:90] [inset:auto_12px_calc(86px_+_env(safe-area-inset-bottom))_12px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [max-width:620px] [margin-inline:auto] [padding:14px] [border:1px_solid_var(--border-strong)] [border-radius:18px] [background:rgba(17,17,20,.98)] [box-shadow:var(--shadow)] [backdrop-filter:blur(18px)] [&_>_div]:[display:grid] [&_>_div]:[gap:3px] [&_>_div]:[min-width:0] [&_span]:[color:var(--text-soft)] [&_span]:[font-size:.78rem] [&_span]:[line-height:1.4] [&_.button]:[width:auto] [&_.button]:[min-width:124px] min-[900px]:[inset-inline:auto_24px] min-[900px]:[bottom:24px] min-[900px]:[width:min(520px,_calc(100vw_-_48px))] min-[900px]:[margin:0] max-[560px]:[align-items:stretch] max-[560px]:[flex-direction:column]" role="status" aria-live="polite">
          <div>
            <strong>{t("pwa.updateTitle")}</strong>
            <span>{dirty ? t("pwa.updateUnsaved") : t("pwa.updateBody")}</span>
          </div>
          <button
            type="button"
            className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
            onClick={applyUpdate}
            disabled={dirty}
          >
            <RefreshCw size={16} />
            {t("pwa.updateAction")}
          </button>
        </aside>
      ) : null}

      {installPrompt ? (
        <aside className="pwa-install [position:fixed] [z-index:90] [inset:auto_12px_calc(86px_+_env(safe-area-inset-bottom))_12px] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [max-width:620px] [margin-inline:auto] [padding:14px] [border:1px_solid_var(--border-strong)] [border-radius:18px] [background:rgba(17,17,20,.98)] [box-shadow:var(--shadow)] [backdrop-filter:blur(18px)] [&_>_div:first-child]:[display:grid] [&_>_div:first-child]:[gap:3px] [&_>_div:first-child]:[min-width:0] [&_span]:[color:var(--text-soft)] [&_span]:[font-size:.78rem] [&_span]:[line-height:1.4] [&_.button]:[width:auto] [&_.button]:[min-width:124px] min-[900px]:[inset-inline:auto_24px] min-[900px]:[bottom:24px] min-[900px]:[width:min(520px,_calc(100vw_-_48px))] min-[900px]:[margin:0] max-[560px]:[align-items:stretch] max-[560px]:[flex-direction:column]" aria-label={t("pwa.installTitle")}>
          <div>
            <strong>{t("pwa.installTitle")}</strong>
            <span>{t("pwa.installBody")}</span>
          </div>
          <div className="pwa-install-actions [display:flex] [gap:8px] [align-items:center] max-[560px]:[&_.button]:[flex:1]">
            <button type="button" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" onClick={install}>
              <Download size={16} />
              {t("pwa.installAction")}
            </button>
            <button
              type="button"
              className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]"
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
