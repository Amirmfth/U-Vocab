ALTER TABLE "ConversationSession"
ADD COLUMN "turnInFlight" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "BattleGame" AS ENUM ('RAPID_RECALL','ARTICLE','COLLOCATION','ODD_ONE_OUT','SYNONYM','PREPOSITION');
CREATE TYPE "BattleMode" AS ENUM ('TIMED','UNTIMED');
CREATE TYPE "WritingMode" AS ENUM ('GUIDED','OPEN');
CREATE TYPE "WritingStatus" AS ENUM ('ACTIVE','EVALUATED');

CREATE TABLE "BattleSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "game" "BattleGame" NOT NULL,
  "mode" "BattleMode" NOT NULL,
  "durationSec" INTEGER,
  "score" INTEGER NOT NULL DEFAULT 0,
  "correct" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleQuestion" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "lexemeId" TEXT,
  "position" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "expected" TEXT NOT NULL,
  "explanation" TEXT,
  "answer" TEXT,
  "correct" BOOLEAN,
  "responseMs" INTEGER,
  "answeredAt" TIMESTAMP(3),
  CONSTRAINT "BattleQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "mode" "WritingMode" NOT NULL,
  "status" "WritingStatus" NOT NULL DEFAULT 'ACTIVE',
  "level" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "targetWords" INTEGER NOT NULL,
  "task" TEXT NOT NULL,
  "draft" TEXT NOT NULL DEFAULT '',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "evaluation" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedAt" TIMESTAMP(3),
  CONSTRAINT "WritingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingTarget" (
  "id" TEXT NOT NULL,
  "writingSessionId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "WritingTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BattleSession_userId_startedAt_idx" ON "BattleSession"("userId","startedAt");
CREATE UNIQUE INDEX "BattleQuestion_sessionId_position_key" ON "BattleQuestion"("sessionId","position");
CREATE INDEX "BattleQuestion_sessionId_position_idx" ON "BattleQuestion"("sessionId","position");
CREATE INDEX "WritingSession_userId_createdAt_idx" ON "WritingSession"("userId","createdAt");
CREATE INDEX "WritingSession_parentId_idx" ON "WritingSession"("parentId");
CREATE UNIQUE INDEX "WritingTarget_writingSessionId_lexemeId_key" ON "WritingTarget"("writingSessionId","lexemeId");
CREATE INDEX "WritingTarget_writingSessionId_position_idx" ON "WritingTarget"("writingSessionId","position");

ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BattleQuestion" ADD CONSTRAINT "BattleQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BattleQuestion" ADD CONSTRAINT "BattleQuestion_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WritingSession" ADD CONSTRAINT "WritingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingTarget" ADD CONSTRAINT "WritingTarget_writingSessionId_fkey" FOREIGN KEY ("writingSessionId") REFERENCES "WritingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingTarget" ADD CONSTRAINT "WritingTarget_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
