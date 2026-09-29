import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { VerifyEmailForm } from "./VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const email = params.email?.trim() ?? "";

  return (
    <main className="login-page">
      <VerifyEmailForm
        email={email}
        returnTo={returnTo}
        invalidToken={params.error === "invalid_token"}
      />
      <p className="muted">
        Already verified?{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          Sign in
        </Link>
      </p>
    </main>
  );
}
