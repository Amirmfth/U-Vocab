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
      className={"button button-" + variant + " " + className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-disabled={pending || disabled}
    >
      {pending ? (
        <>
          <LoaderCircle className="spinner" size={18} aria-hidden="true" />
          <span aria-live="polite">{pendingLabel ?? t("common.working")}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
