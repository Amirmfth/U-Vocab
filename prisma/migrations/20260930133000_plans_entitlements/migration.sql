CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE', 'CANCELED', 'EXPIRED', 'REVOKED');
CREATE TYPE "EntitlementGrantSource" AS ENUM ('ADMIN', 'SUPPORT', 'PROMO', 'TEST', 'MIGRATION');

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'PRO',
  "provider" TEXT NOT NULL,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "providerMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntitlementGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'PRO',
  "source" "EntitlementGrantSource" NOT NULL,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotaUsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userCourseId" TEXT,
  "operationKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 1,
  "periodKey" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuotaUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key"
ON "Subscription"("provider", "providerSubscriptionId");

CREATE INDEX "Subscription_userId_status_currentPeriodEnd_idx"
ON "Subscription"("userId", "status", "currentPeriodEnd");

CREATE INDEX "Subscription_provider_providerCustomerId_idx"
ON "Subscription"("provider", "providerCustomerId");

CREATE INDEX "EntitlementGrant_userId_startsAt_endsAt_idx"
ON "EntitlementGrant"("userId", "startsAt", "endsAt");

CREATE INDEX "EntitlementGrant_userId_revokedAt_idx"
ON "EntitlementGrant"("userId", "revokedAt");

CREATE UNIQUE INDEX "QuotaUsageEvent_userId_operationKey_sourceRef_key"
ON "QuotaUsageEvent"("userId", "operationKey", "sourceRef");

CREATE INDEX "QuotaUsageEvent_userId_operationKey_periodStart_periodEnd_idx"
ON "QuotaUsageEvent"("userId", "operationKey", "periodStart", "periodEnd");

CREATE INDEX "QuotaUsageEvent_userCourseId_operationKey_periodStart_idx"
ON "QuotaUsageEvent"("userCourseId", "operationKey", "periodStart");

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntitlementGrant"
ADD CONSTRAINT "EntitlementGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotaUsageEvent"
ADD CONSTRAINT "QuotaUsageEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotaUsageEvent"
ADD CONSTRAINT "QuotaUsageEvent_userCourseId_fkey"
FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
