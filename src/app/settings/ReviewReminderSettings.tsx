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
    <section className="panel notification-settings border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 grid gap-4.5 rounded-exact-18px">
      <div className="notification-settings-heading flex items-start justify-between gap-4 in-h2:margin-4px-0-6px in-p-2:mb-0 uv-max680:items-stretch uv-max680:flex-col">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("notifications.eyebrow")}</p>
          <h2>{t("notifications.title")}</h2>
          <p className="muted text-uv-text-muted">{t("notifications.description")}</p>
        </div>
        <span className={enabled ? "notification-status is-enabled flex-none padding-5px-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-muted text-exact-p75rem font-bold in-is-enabled:border-color-mix-in-srgb-success-48pct-border in-is-enabled:bg-uv-cafddaf6a65 in-is-enabled:text-uv-success uv-max680:w-fit" : "notification-status flex-none padding-5px-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-muted text-exact-p75rem font-bold in-is-enabled:border-color-mix-in-srgb-success-48pct-border in-is-enabled:bg-uv-cafddaf6a65 in-is-enabled:text-uv-success uv-max680:w-fit"}>
          {enabled ? t("notifications.on") : t("notifications.off")}
        </span>
      </div>

      <div className="notification-preferences-grid grid grid-template-columns-repeat-3-minmax-0-1fr gap-2.5 in-label:grid in-label:gap-1.5 in-label:text-uv-text-muted in-label:text-exact-p78rem in-input:min-h-11.5 in-input:w-full in-input:border-1px-solid-border-2 in-input:rounded-exact-12px in-input:padding-0-12px in-input:bg-uv-surface-raised in-input:text-uv-text uv-max680:grid-template-columns-1fr">
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

      <p className="muted notification-device-summary text-uv-text-muted m-0 text-exact-p84rem line-height-1p5">
        {t("notifications.devices", { count: activeDeviceCount })}
        {deviceSubscribed ? " · " + t("notifications.thisDeviceActive") : ""}
      </p>

      {initialTimeZone === "UTC" ? (
        <p className="notification-warning m-0 text-exact-p84rem line-height-1p5 text-uv-warning">{t("notifications.timeZoneFallback")}</p>
      ) : null}
      {unavailable ? <p className="notification-warning m-0 text-exact-p84rem line-height-1p5 text-uv-warning">{unavailable}</p> : null}
      {message ? <p className="notification-message m-0 text-exact-p84rem line-height-1p5 text-uv-text-soft" role="status">{message}</p> : null}

      <div className="notification-actions flex gap-2.5 in-button-2:w-auto uv-max680:in-button-2:w-full">
        {!enabled || !deviceSubscribed ? (
          <button
            type="button"
            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
            disabled={pending || Boolean(unavailable) || supported === null}
            onClick={enable}
          >
            <Bell size={17} />
            {pending ? t("common.working") : t("notifications.enable")}
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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
