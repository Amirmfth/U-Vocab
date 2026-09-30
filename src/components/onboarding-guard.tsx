"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthPage } from "@/lib/auth-routing";

export function OnboardingGuard({
  complete,
}: {
  complete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      !complete &&
      pathname !== "/onboarding" &&
      !isAuthPage(pathname)
    ) {
      router.replace("/onboarding");
    }
  }, [complete, pathname, router]);

  return null;
}
