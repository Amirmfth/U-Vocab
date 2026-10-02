-- CreateEnum
CREATE TYPE "PushSubscriptionStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INVALID');
CREATE TYPE "NotificationType" AS ENUM ('REVIEW_REMINDER');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED_TRANSIENT', 'FAILED_PERMANENT', 'SKIPPED');

-- CreateTable
CREATE TABLE "WebPushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "deviceLabel" TEXT,
  "status" "PushSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewNotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userCourseId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "reminderMinuteOfDay" INTEGER NOT NULL DEFAULT 1080,
  "minimumDueCount" INTEGER NOT NULL DEFAULT 1,
  "timezoneSource" TEXT NOT NULL DEFAULT 'USER',
  "quietStartMinuteOfDay" INTEGER,
  "quietEndMinuteOfDay" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userCourseId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "bucketKey" TEXT NOT NULL,
  "dueCount" INTEGER NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "attemptedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerStatus" INTEGER,
  "errorCategory" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX "WebPushSubscription_userId_status_idx" ON "WebPushSubscription"("userId", "status");
CREATE INDEX "WebPushSubscription_status_lastSeenAt_idx" ON "WebPushSubscription"("status", "lastSeenAt");
CREATE UNIQUE INDEX "ReviewNotificationPreference_userCourseId_key" ON "ReviewNotificationPreference"("userCourseId");
CREATE INDEX "ReviewNotificationPreference_userId_enabled_idx" ON "ReviewNotificationPreference"("userId", "enabled");
CREATE INDEX "ReviewNotificationPreference_enabled_reminderMinuteOfDay_idx" ON "ReviewNotificationPreference"("enabled", "reminderMinuteOfDay");
CREATE UNIQUE INDEX "NotificationDelivery_subscriptionId_type_bucketKey_key" ON "NotificationDelivery"("subscriptionId", "type", "bucketKey");
CREATE INDEX "NotificationDelivery_userId_type_createdAt_idx" ON "NotificationDelivery"("userId", "type", "createdAt");
CREATE INDEX "NotificationDelivery_status_attemptedAt_idx" ON "NotificationDelivery"("status", "attemptedAt");
CREATE INDEX "NotificationDelivery_userCourseId_createdAt_idx" ON "NotificationDelivery"("userCourseId", "createdAt");

ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_userCourseId_fkey" FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userCourseId_fkey" FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebPushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_reminderMinuteOfDay_check" CHECK ("reminderMinuteOfDay" BETWEEN 0 AND 1439);
ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_minimumDueCount_check" CHECK ("minimumDueCount" BETWEEN 1 AND 9999);
ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_quietStartMinuteOfDay_check" CHECK ("quietStartMinuteOfDay" IS NULL OR "quietStartMinuteOfDay" BETWEEN 0 AND 1439);
ALTER TABLE "ReviewNotificationPreference" ADD CONSTRAINT "ReviewNotificationPreference_quietEndMinuteOfDay_check" CHECK ("quietEndMinuteOfDay" IS NULL OR "quietEndMinuteOfDay" BETWEEN 0 AND 1439);
