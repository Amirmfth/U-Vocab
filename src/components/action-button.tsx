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
      className={"button w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target button-" + variant + " " + className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-disabled={pending || disabled}
    >
      {pending ? (
        <>
          <LoaderCircle className="spinner animation-spin-850ms-linear-infinite" size={18} aria-hidden="true" />
          <span aria-live="polite">{pendingLabel ?? t("common.working")}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
