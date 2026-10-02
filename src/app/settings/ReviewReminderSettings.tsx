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
    void currentPushSubscription().then((subscription) => {
      setDeviceSubscribed(Boolean(subscription));
    });
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
    <section className="panel notification-settings">
      <div className="notification-settings-heading">
        <div>
          <p className="eyebrow">{t("notifications.eyebrow")}</p>
          <h2>{t("notifications.title")}</h2>
          <p className="muted">{t("notifications.description")}</p>
        </div>
        <span className={enabled ? "notification-status is-enabled" : "notification-status"}>
          {enabled ? t("notifications.on") : t("notifications.off")}
        </span>
      </div>

      <div className="notification-preferences-grid">
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

      <p className="muted notification-device-summary">
        {t("notifications.devices", { count: activeDeviceCount })}
        {deviceSubscribed ? " · " + t("notifications.thisDeviceActive") : ""}
      </p>

      {initialTimeZone === "UTC" ? (
        <p className="notification-warning">{t("notifications.timeZoneFallback")}</p>
      ) : null}
      {unavailable ? <p className="notification-warning">{unavailable}</p> : null}
      {message ? <p className="notification-message" role="status">{message}</p> : null}

      <div className="notification-actions">
        {!enabled || !deviceSubscribed ? (
          <button
            type="button"
            className="button button-primary"
            disabled={pending || Boolean(unavailable) || supported === null}
            onClick={enable}
          >
            <Bell size={17} />
            {pending ? t("common.working") : t("notifications.enable")}
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary"
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
