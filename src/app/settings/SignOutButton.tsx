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
      className="button button-secondary"
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
