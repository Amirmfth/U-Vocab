"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "@/i18n/client";

export function ActionButton({
  children,
  pendingLabel,
  className = "",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const t = useTranslations();

  return (
    <button
      className={"button [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)] button-" + variant + " " + className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-disabled={pending || disabled}
    >
      {pending ? (
        <>
          <LoaderCircle className="spinner [animation:spin_850ms_linear_infinite]" size={18} aria-hidden="true" />
          <span aria-live="polite">{pendingLabel ?? t("common.working")}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
