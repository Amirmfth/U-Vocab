ALTER TABLE "AIUsageEvent"
ADD COLUMN "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "inputCost" DECIMAL(18,10),
ADD COLUMN "cachedInputCost" DECIMAL(18,10),
ADD COLUMN "outputCost" DECIMAL(18,10),
ADD COLUMN "reasoningCost" DECIMAL(18,10),
ADD COLUMN "totalCost" DECIMAL(18,10),
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN "pricingKey" TEXT,
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "timeToFirstTokenMs" INTEGER,
ADD COLUMN "retryCount" INTEGER,
ADD COLUMN "errorCategory" TEXT,
ADD COLUMN "metadata" JSONB;

CREATE INDEX "AIUsageEvent_userId_status_createdAt_idx"
ON "AIUsageEvent"("userId", "status", "createdAt");
