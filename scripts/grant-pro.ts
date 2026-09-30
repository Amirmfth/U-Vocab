import { db } from "../src/lib/db";
import { createManualGrant } from "../src/lib/billing/service";

function option(name: string) {
  const prefix = "--" + name + "=";
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const email = option("email")?.trim().toLowerCase();
  const days = Number(option("days") ?? "7");
  if (!email) throw new Error("--email is required.");
  if (!Number.isFinite(days) || days <= 0 || days > 365) {
    throw new Error("--days must be between 1 and 365.");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("User not found.");

  const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const grant = await createManualGrant({
    userId: user.id,
    plan: "PRO",
    source: "TEST",
    reason: "Temporary CLI Pro grant",
    endsAt,
    createdBy: "cli:grant-pro",
  });

  console.log(
    `Granted PRO to ${user.email} until ${grant.endsAt?.toISOString() ?? "no expiry"}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
