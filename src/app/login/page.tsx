import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth-routing";
import { getServerTranslator } from "@/i18n/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getAuthSession()) redirect(returnTo);
  const { t } = await getServerTranslator();

  return (
    <main className="login-page [min-height:100dvh] [display:grid] [place-items:center] [padding:24px_16px]">
      <LoginForm returnTo={returnTo} passwordReset={params.reset === "1"} />
      <p className="muted [color:var(--text-muted)]">
        {t("auth.newTo")}{" "}
        <Link href={"/signup?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.createAccount")}
        </Link>
      </p>
    </main>
  );
}
