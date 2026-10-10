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
      className={"button w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383 button-" + variant + " " + className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-disabled={pending || disabled}
    >
      {pending ? (
        <>
          <LoaderCircle className="spinner uv-animation-f244465a8b" size={18} aria-hidden="true" />
          <span aria-live="polite">{pendingLabel ?? t("common.working")}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
