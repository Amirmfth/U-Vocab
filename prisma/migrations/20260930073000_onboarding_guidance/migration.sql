ALTER TABLE "User"
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "onboardingVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;

UPDATE "User"
SET
  "onboardingCompletedAt" = NOW(),
  "onboardingVersion" = 1,
  "onboardingStep" = 7;

CREATE TABLE "UserGuideState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "seenAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserGuideState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGuideState_userId_guideId_key"
ON "UserGuideState"("userId", "guideId");

CREATE INDEX "UserGuideState_userId_dismissedAt_idx"
ON "UserGuideState"("userId", "dismissedAt");

ALTER TABLE "UserGuideState"
ADD CONSTRAINT "UserGuideState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
