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
    <section className="panel notification-settings uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid gap-4.5 rounded-uv-r6d27d54c6c">
      <div className="notification-settings-heading flex items-start justify-between gap-4 uv-vd552c26874:uv-margin-fcf6155ded uv-vb19eb067c9:mb-0 uv-max680:items-stretch uv-max680:flex-col">
        <div>
          <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("notifications.eyebrow")}</p>
          <h2>{t("notifications.title")}</h2>
          <p className="muted text-uv-text-muted">{t("notifications.description")}</p>
        </div>
        <span className={enabled ? "notification-status is-enabled uv-flex-71f8e7976e uv-padding-6c1a581b91 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-muted text-uv-f60ac4cf407 font-bold uv-v23e0a94081:uv-border-color-a6a2a05324 uv-v23e0a94081:bg-uv-cafddaf6a65 uv-v23e0a94081:text-uv-success uv-max680:w-fit" : "notification-status uv-flex-71f8e7976e uv-padding-6c1a581b91 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-muted text-uv-f60ac4cf407 font-bold uv-v23e0a94081:uv-border-color-a6a2a05324 uv-v23e0a94081:bg-uv-cafddaf6a65 uv-v23e0a94081:text-uv-success uv-max680:w-fit"}>
          {enabled ? t("notifications.on") : t("notifications.off")}
        </span>
      </div>

      <div className="notification-preferences-grid grid uv-grid-template-columns-563355decf gap-2.5 uv-v586b3820a5:grid uv-v586b3820a5:gap-1.5 uv-v586b3820a5:text-uv-text-muted uv-v586b3820a5:text-uv-f5f68d82942 uv-vcf5ce320fa:min-h-11.5 uv-vcf5ce320fa:w-full uv-vcf5ce320fa:uv-border-8d7f82f403 uv-vcf5ce320fa:rounded-uv-r0939007802 uv-vcf5ce320fa:uv-padding-f74548ca12 uv-vcf5ce320fa:bg-uv-surface-raised uv-vcf5ce320fa:text-uv-text uv-max680:uv-grid-template-columns-6a5c4d4d49">
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

      <p className="muted notification-device-summary text-uv-text-muted m-0 text-uv-f6b4e408307 uv-line-height-aa8f289ebe">
        {t("notifications.devices", { count: activeDeviceCount })}
        {deviceSubscribed ? " · " + t("notifications.thisDeviceActive") : ""}
      </p>

      {initialTimeZone === "UTC" ? (
        <p className="notification-warning m-0 text-uv-f6b4e408307 uv-line-height-aa8f289ebe text-uv-warning">{t("notifications.timeZoneFallback")}</p>
      ) : null}
      {unavailable ? <p className="notification-warning m-0 text-uv-f6b4e408307 uv-line-height-aa8f289ebe text-uv-warning">{unavailable}</p> : null}
      {message ? <p className="notification-message m-0 text-uv-f6b4e408307 uv-line-height-aa8f289ebe text-uv-text-soft" role="status">{message}</p> : null}

      <div className="notification-actions flex gap-2.5 uv-vcded88c612:w-auto uv-max680:uv-vcded88c612:w-full">
        {!enabled || !deviceSubscribed ? (
          <button
            type="button"
            className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
            disabled={pending || Boolean(unavailable) || supported === null}
            onClick={enable}
          >
            <Bell size={17} />
            {pending ? t("common.working") : t("notifications.enable")}
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
