CREATE TABLE "GrammarLesson" (
  "id" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "promptVersion" TEXT NOT NULL DEFAULT 'v1',
  "generatedByAi" BOOLEAN NOT NULL DEFAULT true,
  "overview" TEXT NOT NULL,
  "intuition" TEXT NOT NULL,
  "whenToUse" JSONB NOT NULL,
  "recognitionCues" JSONB NOT NULL,
  "formation" JSONB NOT NULL,
  "ruleDetails" JSONB NOT NULL,
  "tables" JSONB NOT NULL,
  "examples" JSONB NOT NULL,
  "contrasts" JSONB NOT NULL,
  "commonMistakes" JSONB NOT NULL,
  "exceptions" JSONB NOT NULL,
  "usageNotes" JSONB NOT NULL,
  "speakingWritingTips" JSONB NOT NULL,
  "memoryAids" JSONB NOT NULL,
  "cheatSheet" JSONB NOT NULL,
  "sourceContentVersion" INTEGER NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarLesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrammarLesson_grammarConceptId_key"
ON "GrammarLesson"("grammarConceptId");

CREATE INDEX "GrammarLesson_updatedAt_idx"
ON "GrammarLesson"("updatedAt");

ALTER TABLE "GrammarLesson"
ADD CONSTRAINT "GrammarLesson_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
