CREATE TABLE "AiDecisionCache" (
  "id" TEXT NOT NULL,
  "userCourseId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiDecisionCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiDecisionCache_cacheKey_key" ON "AiDecisionCache"("cacheKey");
CREATE INDEX "AiDecisionCache_userCourseId_operation_updatedAt_idx"
  ON "AiDecisionCache"("userCourseId", "operation", "updatedAt");
CREATE INDEX "AiDecisionCache_expiresAt_idx" ON "AiDecisionCache"("expiresAt");

ALTER TABLE "AiDecisionCache"
  ADD CONSTRAINT "AiDecisionCache_userCourseId_fkey"
  FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
