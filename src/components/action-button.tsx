"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function ActionButton({
  children,
  pendingLabel = "Working…",
  className = "",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={"button button-" + variant + " " + className}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="spinner" size={18} aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
