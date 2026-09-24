CREATE TABLE "AiGenerationCache" (
  "id" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiGenerationCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiGenerationCache_cacheKey_key"
ON "AiGenerationCache"("cacheKey");

CREATE INDEX "AiGenerationCache_operation_updatedAt_idx"
ON "AiGenerationCache"("operation", "updatedAt");
