"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncTimezone } from "./actions";

export function TimezoneSync({ savedTimezone }: { savedTimezone: string }) {
  const router = useRouter();

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone || timezone === savedTimezone) return;

    void syncTimezone(timezone).then(() => router.refresh());
  }, [router, savedTimezone]);

  return null;
}
