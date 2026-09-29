import Link from "next/link";
import { safeReturnTo } from "@/lib/auth-routing";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <main className="login-page">
      <SignupForm returnTo={returnTo} />
      <p className="muted">
        Already have an account?{" "}
        <Link href={"/login?returnTo=" + encodeURIComponent(returnTo)}>
          Sign in
        </Link>
      </p>
    </main>
  );
}
