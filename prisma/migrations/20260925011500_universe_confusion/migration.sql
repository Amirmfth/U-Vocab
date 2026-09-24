CREATE TYPE "ConfusionState" AS ENUM ('TRACKED', 'LEARNED');

CREATE TABLE "ConfusionPair" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leftLexemeId" TEXT NOT NULL,
  "rightLexemeId" TEXT NOT NULL,
  "state" "ConfusionState" NOT NULL DEFAULT 'TRACKED',
  "content" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "correctAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastPracticedAt" TIMESTAMP(3),
  "learnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfusionPair_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfusionPair_userId_leftLexemeId_rightLexemeId_key"
ON "ConfusionPair"("userId", "leftLexemeId", "rightLexemeId");

CREATE INDEX "ConfusionPair_userId_state_updatedAt_idx"
ON "ConfusionPair"("userId", "state", "updatedAt");

ALTER TABLE "ConfusionPair"
ADD CONSTRAINT "ConfusionPair_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConfusionPair"
ADD CONSTRAINT "ConfusionPair_leftLexemeId_fkey"
FOREIGN KEY ("leftLexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConfusionPair"
ADD CONSTRAINT "ConfusionPair_rightLexemeId_fkey"
FOREIGN KEY ("rightLexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
