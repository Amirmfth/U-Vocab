import { db } from "@/lib/db";

export async function getCurrentUser() {
  const email = process.env.APP_USER_EMAIL ?? "amir@u-vocab.local";
  return db.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });
}
