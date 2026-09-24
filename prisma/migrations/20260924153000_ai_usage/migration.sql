CREATE TYPE "AIUsageStatus" AS ENUM ('SUCCESS', 'ERROR');

CREATE TABLE "AIUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AIUsageStatus" NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIUsageEvent_userId_createdAt_idx"
ON "AIUsageEvent"("userId", "createdAt");

CREATE INDEX "AIUsageEvent_userId_operation_createdAt_idx"
ON "AIUsageEvent"("userId", "operation", "createdAt");

CREATE INDEX "AIUsageEvent_userId_model_createdAt_idx"
ON "AIUsageEvent"("userId", "model", "createdAt");

ALTER TABLE "AIUsageEvent"
ADD CONSTRAINT "AIUsageEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
