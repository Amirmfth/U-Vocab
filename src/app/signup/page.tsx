import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { getServerTranslator } from "@/i18n/server";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const { t } = await getServerTranslator();

  return (
    <main className="login-page [min-height:100dvh] [display:grid] [place-items:center] [padding:24px_16px]">
      <SignupForm returnTo={returnTo} />
      <p className="muted [color:var(--text-muted)]">
        {t("auth.alreadyHave")}{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.signIn")}
        </Link>
      </p>
    </main>
  );
}
