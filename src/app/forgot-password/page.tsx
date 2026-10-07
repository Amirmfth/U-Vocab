import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { getServerTranslator } from "@/i18n/server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const { t } = await getServerTranslator();

  return (
    <main className="login-page [min-height:100dvh] [display:grid] [place-items:center] [padding:24px_16px]">
      <ForgotPasswordForm returnTo={returnTo} />
      <p className="muted [color:var(--text-muted)]">
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </main>
  );
}
