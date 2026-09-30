import type {
  EntitlementGrantSource,
  Plan,
  SubscriptionStatus,
} from "@prisma/client";
import { db } from "@/lib/db";

export type SubscriptionSyncInput = {
  userId: string;
  provider: string;
  providerCustomerId?: string | null;
  providerSubscriptionId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  providerMetadata?: Record<string, string | number | boolean | null>;
};

export async function syncSubscription(input: SubscriptionSyncInput) {
  return db.subscription.upsert({
    where: {
      provider_providerSubscriptionId: {
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
      },
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId ?? null,
      providerSubscriptionId: input.providerSubscriptionId,
      plan: input.plan,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      providerMetadata: input.providerMetadata,
    },
    update: {
      userId: input.userId,
      providerCustomerId: input.providerCustomerId ?? null,
      plan: input.plan,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      providerMetadata: input.providerMetadata,
    },
  });
}

export async function activateSubscription(
  input: Omit<SubscriptionSyncInput, "status">,
) {
  return syncSubscription({ ...input, status: "ACTIVE" });
}

export async function renewSubscription(
  input: Omit<SubscriptionSyncInput, "status">,
) {
  return syncSubscription({ ...input, status: "ACTIVE" });
}

export async function cancelSubscription(
  input: Omit<SubscriptionSyncInput, "status">,
) {
  return syncSubscription({
    ...input,
    status: "ACTIVE",
    cancelAtPeriodEnd: true,
  });
}

export async function expireSubscription(
  input: Omit<SubscriptionSyncInput, "status">,
) {
  return syncSubscription({ ...input, status: "EXPIRED" });
}

export async function revokeSubscription(
  input: Omit<SubscriptionSyncInput, "status">,
) {
  return syncSubscription({ ...input, status: "REVOKED" });
}

export async function createManualGrant(input: {
  userId: string;
  plan?: Plan;
  source: EntitlementGrantSource;
  reason?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  createdBy?: string | null;
}) {
  return db.entitlementGrant.create({
    data: {
      userId: input.userId,
      plan: input.plan ?? "PRO",
      source: input.source,
      reason: input.reason ?? null,
      startsAt: input.startsAt ?? new Date(),
      endsAt: input.endsAt ?? null,
      createdBy: input.createdBy ?? null,
    },
  });
}
