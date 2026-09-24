CREATE TYPE "ConversationKind" AS ENUM ('PRACTICE', 'MISSION');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ConversationSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "ConversationKind" NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "level" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "aiRole" TEXT NOT NULL,
  "objective" TEXT,
  "revealTargets" BOOLEAN NOT NULL DEFAULT true,
  "summary" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ConversationRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationTarget" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "uses" INTEGER NOT NULL DEFAULT 0,
  "successfulUses" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "ConversationTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConversationSession_userId_status_updatedAt_idx"
ON "ConversationSession"("userId", "status", "updatedAt");

CREATE INDEX "ConversationMessage_sessionId_createdAt_idx"
ON "ConversationMessage"("sessionId", "createdAt");

CREATE UNIQUE INDEX "ConversationTarget_sessionId_lexemeId_key"
ON "ConversationTarget"("sessionId", "lexemeId");

CREATE INDEX "ConversationTarget_sessionId_position_idx"
ON "ConversationTarget"("sessionId", "position");

ALTER TABLE "ConversationSession"
ADD CONSTRAINT "ConversationSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
ADD CONSTRAINT "ConversationMessage_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
ADD CONSTRAINT "ConversationMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationTarget"
ADD CONSTRAINT "ConversationTarget_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationTarget"
ADD CONSTRAINT "ConversationTarget_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
