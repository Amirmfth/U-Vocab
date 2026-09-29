"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="button button-secondary"
      type="button"
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <LogOut size={17} />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
