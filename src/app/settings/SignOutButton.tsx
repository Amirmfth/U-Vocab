"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "@/i18n/client";
import { resetObservabilityIdentity } from "@/components/observability-identity";
import { clearPwaRuntimeCaches } from "@/components/pwa-manager";
import { disableCurrentPushDeviceForLogout } from "@/lib/notifications/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const t = useTranslations();

  return (
    <button
      className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
      type="button"
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          resetObservabilityIdentity();
          await disableCurrentPushDeviceForLogout();
          await clearPwaRuntimeCaches();
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <LogOut size={17} />
      {pending ? t("settings.signingOut") : t("settings.signOut")}
    </button>
  );
}
