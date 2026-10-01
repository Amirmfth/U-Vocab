import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "@/lib/current-user";
import { recordProductEvent } from "@/lib/product-events";
import { observabilityConfig } from "@/lib/observability/config";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.OBSERVABILITY_SMOKE_ENABLED !== "true") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const error = new Error("U-Vocab observability smoke test");
  Sentry.withScope((scope) => {
    scope.setTag("smoke_test", "true");
    scope.setUser({ id: user.id });
    Sentry.captureException(error);
  });

  await recordProductEvent("observability_smoke_test", {
    surface: "server",
    release: observabilityConfig.release,
  });

  await Sentry.flush(2_000);

  return Response.json({
    ok: true,
    release: observabilityConfig.release,
    sentryEnabled: observabilityConfig.sentry.enabled,
    analyticsEnabled: observabilityConfig.posthog.enabled,
  });
}
