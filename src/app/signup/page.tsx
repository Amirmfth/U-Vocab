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
    <main className="login-page min-h-dvh grid uv-place-items-305047e96e uv-padding-3e6175ce44">
      <SignupForm returnTo={returnTo} />
      <p className="muted text-uv-text-muted">
        {t("auth.alreadyHave")}{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          {t("auth.signIn")}
        </Link>
      </p>
    </main>
  );
}
