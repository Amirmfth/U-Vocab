"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import {
  currentPushSubscription,
  pushSupported,
  registerSubscriptionWithServer,
  subscribeCurrentDevice,
} from "@/lib/notifications/client";

export function ReviewReminderSettings({
  configured,
  publicKey,
  initialEnabled,
  initialReminderTime,
  initialMinimumDueCount,
  initialTimeZone,
  activeDeviceCount,
}: {
  configured: boolean;
  publicKey: string;
  initialEnabled: boolean;
  initialReminderTime: string;
  initialMinimumDueCount: number;
  initialTimeZone: string;
  activeDeviceCount: number;
}) {
  const t = useTranslations();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [reminderTime, setReminderTime] = useState(initialReminderTime);
  const [minimumDueCount, setMinimumDueCount] = useState(initialMinimumDueCount);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const available = pushSupported();
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    void currentPushSubscription()
      .then((subscription) => setDeviceSubscribed(Boolean(subscription)))
      .catch(() => setDeviceSubscribed(false));
  }, []);

  const savePreference = async (nextEnabled: boolean) => {
    const [hour, minute] = reminderTime.split(":").map(Number);
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enabled: nextEnabled,
        reminderMinuteOfDay: hour * 60 + minute,
        minimumDueCount,
        timeZone,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? t("notifications.saveError"));
    }
  };

  const enable = async () => {
    if (!configured || !supported || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const nextPermission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setMessage(
          nextPermission === "denied"
            ? t("notifications.permissionDenied")
            : t("notifications.permissionNotGranted"),
        );
        return;
      }

      const subscription = await subscribeCurrentDevice(publicKey);
      await registerSubscriptionWithServer(subscription);
      await savePreference(true);
      setEnabled(true);
      setDeviceSubscribed(true);
      setMessage(t("notifications.enabledSuccess"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("notifications.saveError"));
    } finally {
      setPending(false);
    }
  };

  const disable = async () => {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await savePreference(false);
      const subscription = await currentPushSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscription", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setDeviceSubscribed(false);
      setMessage(t("notifications.disabledSuccess"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("notifications.saveError"));
    } finally {
      setPending(false);
    }
  };

  const unavailable =
    !configured
      ? t("notifications.notConfigured")
      : supported === false
        ? t("notifications.unsupported")
        : permission === "denied"
          ? t("notifications.permissionDenied")
          : null;

  return (
    <section className="panel notification-settings [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:grid] [gap:18px] [border-radius:18px]">
      <div className="notification-settings-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] [&_h2]:[margin:4px_0_6px] [&_p]:[margin-bottom:0] max-[680px]:[align-items:stretch] max-[680px]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("notifications.eyebrow")}</p>
          <h2>{t("notifications.title")}</h2>
          <p className="muted [color:var(--text-muted)]">{t("notifications.description")}</p>
        </div>
        <span className={enabled ? "notification-status is-enabled [flex:none] [padding:5px_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-muted)] [font-size:.75rem] [font-weight:700] [&.is-enabled]:[border-color:color-mix(in_srgb,_var(--success)_48%,_var(--border))] [&.is-enabled]:[background:var(--success-soft)] [&.is-enabled]:[color:var(--success)] max-[680px]:[width:fit-content]" : "notification-status [flex:none] [padding:5px_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-muted)] [font-size:.75rem] [font-weight:700] [&.is-enabled]:[border-color:color-mix(in_srgb,_var(--success)_48%,_var(--border))] [&.is-enabled]:[background:var(--success-soft)] [&.is-enabled]:[color:var(--success)] max-[680px]:[width:fit-content]"}>
          {enabled ? t("notifications.on") : t("notifications.off")}
        </span>
      </div>

      <div className="notification-preferences-grid [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:10px] [&_label]:[display:grid] [&_label]:[gap:6px] [&_label]:[color:var(--text-muted)] [&_label]:[font-size:.78rem] [&_input]:[min-height:46px] [&_input]:[width:100%] [&_input]:[border:1px_solid_var(--border)] [&_input]:[border-radius:12px] [&_input]:[padding:0_12px] [&_input]:[background:var(--surface-raised)] [&_input]:[color:var(--text)] max-[680px]:[grid-template-columns:1fr]">
        <label>
          <span>{t("notifications.reminderTime")}</span>
          <input
            type="time"
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
            disabled={pending}
          />
        </label>
        <label>
          <span>{t("notifications.minimumDue")}</span>
          <input
            type="number"
            min={1}
            max={9999}
            value={minimumDueCount}
            onChange={(event) => setMinimumDueCount(Math.max(1, Number(event.target.value) || 1))}
            disabled={pending}
          />
        </label>
        <label>
          <span>{t("notifications.timeZone")}</span>
          <input
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            placeholder="Europe/Berlin"
            disabled={pending}
          />
        </label>
      </div>

      <p className="muted notification-device-summary [color:var(--text-muted)] [margin:0] [font-size:.84rem] [line-height:1.5]">
        {t("notifications.devices", { count: activeDeviceCount })}
        {deviceSubscribed ? " · " + t("notifications.thisDeviceActive") : ""}
      </p>

      {initialTimeZone === "UTC" ? (
        <p className="notification-warning [margin:0] [font-size:.84rem] [line-height:1.5] [color:var(--warning)]">{t("notifications.timeZoneFallback")}</p>
      ) : null}
      {unavailable ? <p className="notification-warning [margin:0] [font-size:.84rem] [line-height:1.5] [color:var(--warning)]">{unavailable}</p> : null}
      {message ? <p className="notification-message [margin:0] [font-size:.84rem] [line-height:1.5] [color:var(--text-soft)]" role="status">{message}</p> : null}

      <div className="notification-actions [display:flex] [gap:10px] [&_.button]:[width:auto] max-[680px]:[&_.button]:[width:100%]">
        {!enabled || !deviceSubscribed ? (
          <button
            type="button"
            className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
            disabled={pending || Boolean(unavailable) || supported === null}
            onClick={enable}
          >
            <Bell size={17} />
            {pending ? t("common.working") : t("notifications.enable")}
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
            disabled={pending}
            onClick={disable}
          >
            <BellOff size={17} />
            {pending ? t("common.working") : t("notifications.disable")}
          </button>
        )}
      </div>
    </section>
  );
}
