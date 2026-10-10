import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { getServerTranslator } from "@/i18n/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const { t } = await getServerTranslator();

  return (
    <main className="login-page min-h-dvh grid uv-place-items-305047e96e uv-padding-3e6175ce44">
      <ResetPasswordForm
        token={params.token ?? ""}
        returnTo={returnTo}
        invalidToken={Boolean(params.error)}
      />
      <p className="muted text-uv-text-muted">
        <Link href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.requestAnotherReset")}
        </Link>
      </p>
    </main>
  );
}
