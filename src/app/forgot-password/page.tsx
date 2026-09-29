import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <main className="login-page">
      <ForgotPasswordForm returnTo={returnTo} />
      <p className="muted">
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
