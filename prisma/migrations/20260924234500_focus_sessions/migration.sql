CREATE TYPE "SessionKind" AS ENUM ('DAILY_CHALLENGE', 'FOCUS');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');
CREATE TYPE "SessionActivity" AS ENUM ('WARMUP', 'DUE_REVIEW', 'NEW_WORD', 'CONTEXT', 'PRODUCTION', 'FINAL_CHALLENGE');

CREATE TABLE "LearningSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "SessionKind" NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "plannedMinutes" INTEGER NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningSessionItem" (
  "id" TEXT NOT NULL,
  "learningSessionId" TEXT NOT NULL,
  "activity" "SessionActivity" NOT NULL,
  "lexemeId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "href" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "plannedMinutes" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LearningSessionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningSession_userId_status_lastActiveAt_idx" ON "LearningSession"("userId", "status", "lastActiveAt");
CREATE UNIQUE INDEX "LearningSessionItem_learningSessionId_position_key" ON "LearningSessionItem"("learningSessionId", "position");
CREATE INDEX "LearningSessionItem_learningSessionId_position_idx" ON "LearningSessionItem"("learningSessionId", "position");

ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningSessionItem" ADD CONSTRAINT "LearningSessionItem_learningSessionId_fkey"
FOREIGN KEY ("learningSessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningSessionItem" ADD CONSTRAINT "LearningSessionItem_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
