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
      className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
