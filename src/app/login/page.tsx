import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { safeReturnTo } from "@/lib/auth-routing";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getAuthSession()) redirect(returnTo);

  return (
    <main className="login-page">
      <LoginForm returnTo={returnTo} passwordReset={params.reset === "1"} />
      <p className="muted">
        New to U-Vocab?{" "}
        <Link href={"/signup?returnTo=" + encodeURIComponent(returnTo)}>
          Create an account
        </Link>
      </p>
    </main>
  );
}
