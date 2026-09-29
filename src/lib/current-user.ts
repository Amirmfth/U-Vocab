import { cache } from "react";
import { db } from "@/lib/db";
import { requireAppAuth, UnauthorizedError } from "@/lib/auth";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await requireAppAuth();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) throw new UnauthorizedError();
  return user;
});
