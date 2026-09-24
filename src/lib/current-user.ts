import { cache } from "react";
import { db } from "@/lib/db";

export const getCurrentUser = cache(async function getCurrentUser() {
  const email = process.env.APP_USER_EMAIL ?? "amir@u-vocab.local";
  return db.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });
});
