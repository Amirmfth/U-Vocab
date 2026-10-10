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
    <main className="login-page min-h-dvh grid place-items-center padding-24px-16px">
      <LoginForm returnTo={returnTo} passwordReset={params.reset === "1"} />
      <p className="muted text-uv-text-muted">
        {t("auth.newTo")}{" "}
        <Link href={"/signup?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.createAccount")}
        </Link>
      </p>
    </main>
  );
}
