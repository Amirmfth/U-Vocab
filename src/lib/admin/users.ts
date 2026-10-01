import "server-only";

import { EntitlementGrantSource, Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "./auth";
import { appendAdminAudit } from "./audit";
import { createAdminRequestId } from "./request-id";

export async function grantAdminEntitlement(input: {
  userId: string;
  endsAt: Date | null;
  reason?: string | null;
}) {
  const admin = await requireAdmin();
  const requestId = createAdminRequestId();
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!target) throw new Error("User not found.");
  if (input.endsAt && input.endsAt <= new Date()) {
    throw new Error("Grant end time must be in the future.");
  }

  return db.$transaction(async (tx) => {
    const grant = await tx.entitlementGrant.create({
      data: {
        userId: target.id,
        plan: Plan.PRO,
        source: EntitlementGrantSource.ADMIN,
        reason: input.reason?.trim().slice(0, 240) || null,
        endsAt: input.endsAt,
        createdBy: admin.id,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "entitlement.granted",
        targetType: "user",
        targetId: target.id,
        requestId,
        metadata: {
          grantId: grant.id,
          plan: grant.plan,
          source: grant.source,
          endsAt: grant.endsAt?.toISOString() ?? null,
        },
      },
    });
    return grant;
  });
}

export async function revokeAdminEntitlement(grantId: string) {
  const admin = await requireAdmin();
  const requestId = createAdminRequestId();
  return db.$transaction(async (tx) => {
    const grant = await tx.entitlementGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw new Error("Entitlement grant not found.");
    if (grant.revokedAt) return grant;
    const updated = await tx.entitlementGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "entitlement.revoked",
        targetType: "user",
        targetId: grant.userId,
        requestId,
        metadata: { grantId: grant.id, plan: grant.plan },
      },
    });
    return updated;
  });
}

export async function revokeUserSessions(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("Use normal sign-out for your own account.");
  const requestId = createAdminRequestId();
  return db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new Error("User not found.");
    const deleted = await tx.session.deleteMany({ where: { userId } });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "sessions.revoked",
        targetType: "user",
        targetId: userId,
        requestId,
        metadata: { sessionCount: deleted.count },
      },
    });
    return deleted.count;
  });
}

export async function auditAdminAction(input: Parameters<typeof appendAdminAudit>[0]) {
  await requireAdmin();
  return appendAdminAudit(input);
}
