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
      className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
