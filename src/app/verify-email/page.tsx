import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { getServerTranslator } from "@/i18n/server";
import { VerifyEmailForm } from "./VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const email = params.email?.trim() ?? "";
  const { t } = await getServerTranslator();

  return (
    <main className="login-page min-h-dvh grid place-items-center padding-24px-16px">
      <VerifyEmailForm
        email={email}
        returnTo={returnTo}
        invalidToken={params.error === "invalid_token"}
      />
      <p className="muted text-uv-text-muted">
        {t("auth.alreadyVerified")}{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.signIn")}
        </Link>
      </p>
    </main>
  );
}
