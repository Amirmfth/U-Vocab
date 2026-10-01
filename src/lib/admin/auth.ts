import "server-only";

import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { UnauthorizedError } from "@/lib/auth";

export class AdminRequiredError extends UnauthorizedError {
  constructor() {
    super("Administrator access is required.");
    this.name = "AdminRequiredError";
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== UserRole.ADMIN) throw new AdminRequiredError();
  return user;
}

export function isAdminRole(role: UserRole | string | null | undefined) {
  return role === UserRole.ADMIN;
}
