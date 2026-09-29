import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const email = required("AUTH_BOOTSTRAP_EMAIL").toLocaleLowerCase("en-US");
  const password = required("AUTH_BOOTSTRAP_PASSWORD");
  const requestedName = process.env.AUTH_BOOTSTRAP_NAME?.trim();

  if (password.length < 10 || password.length > 128) {
    throw new Error("AUTH_BOOTSTRAP_PASSWORD must be 10-128 characters.");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No existing U-Vocab learner exists for ${email}. Create new accounts through /signup; this command only preserves an existing learner ID.`,
    );
  }

  const passwordHash = await hashPassword(password);
  const name =
    requestedName ||
    user.name?.trim() ||
    email.split("@")[0] ||
    "Learner";

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name,
        emailVerified: true,
      },
    });

    const credentialAccount = await tx.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      select: { id: true },
    });

    if (credentialAccount) {
      await tx.account.update({
        where: { id: credentialAccount.id },
        data: {
          accountId: user.id,
          password: passwordHash,
        },
      });
    } else {
      await tx.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: passwordHash,
        },
      });
    }

    // The legacy app had no Better Auth sessions. Clearing any existing rows
    // makes this command safe to re-run when rotating the bootstrap password.
    await tx.session.deleteMany({ where: { userId: user.id } });
  });

  console.log(
    `Bootstrapped Better Auth credentials for ${email} while preserving User.id=${user.id} and all learner data.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
