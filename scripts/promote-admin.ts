import { UserRole } from "@prisma/client";
import { db } from "../src/lib/db";

function arg(name: string) {
  const index = process.argv.indexOf("--" + name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run admin:promote -- --email admin@example.com");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true, role: true },
  });
  if (!user) throw new Error("No user found for " + email);
  if (!user.emailVerified) {
    throw new Error("Refusing to promote an unverified account.");
  }
  if (user.role === UserRole.ADMIN) {
    console.log(user.email + " is already ADMIN.");
    return;
  }

  const existingAdmins = await db.user.count({ where: { role: UserRole.ADMIN } });
  if (existingAdmins > 0 && process.env.ALLOW_ADMIN_BOOTSTRAP_WITH_EXISTING !== "true") {
    throw new Error(
      "An administrator already exists. Use the admin panel for normal administration, or set ALLOW_ADMIN_BOOTSTRAP_WITH_EXISTING=true for an explicit emergency promotion.",
    );
  }

  await db.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });
  console.log("Promoted verified user " + user.email + " (" + user.id + ") to ADMIN.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
