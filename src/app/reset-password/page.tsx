import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <main className="login-page">
      <ResetPasswordForm
        token={params.token ?? ""}
        returnTo={returnTo}
        invalidToken={Boolean(params.error)}
      />
      <p className="muted">
        <Link href={"/forgot-password?returnTo=" + encodeURIComponent(returnTo)}>
          Request another reset link
        </Link>
      </p>
    </main>
  );
}
