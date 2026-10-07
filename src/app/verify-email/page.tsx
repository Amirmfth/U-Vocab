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
    <main className="login-page [min-height:100dvh] [display:grid] [place-items:center] [padding:24px_16px]">
      <VerifyEmailForm
        email={email}
        returnTo={returnTo}
        invalidToken={params.error === "invalid_token"}
      />
      <p className="muted [color:var(--text-muted)]">
        {t("auth.alreadyVerified")}{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.signIn")}
        </Link>
      </p>
    </main>
  );
}
