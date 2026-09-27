CREATE TYPE "GrammarEvidenceSource" AS ENUM ('PRACTICE', 'WRITING', 'READING_COMPREHENSION', 'CONVERSATION', 'MANUAL');
CREATE TYPE "GrammarEvidenceOutcome" AS ENUM ('SUCCESS', 'ERROR', 'OPPORTUNITY', 'ENCOUNTER');
CREATE TYPE "GrammarEvidenceDimension" AS ENUM ('UNDERSTANDING', 'CONTROLLED_PRODUCTION', 'FREE_PRODUCTION');

ALTER TABLE "UserGrammarProgress"
ADD COLUMN "understanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "controlledProduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "freeProduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "evidenceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastEvidenceAt" TIMESTAMP(3);

CREATE TABLE "GrammarEvidence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "source" "GrammarEvidenceSource" NOT NULL,
  "outcome" "GrammarEvidenceOutcome" NOT NULL,
  "dimension" "GrammarEvidenceDimension" NOT NULL,
  "strength" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "effectiveWeight" DOUBLE PRECISION NOT NULL,
  "accepted" BOOLEAN NOT NULL DEFAULT true,
  "dedupeKey" TEXT NOT NULL,
  "sourceRef" TEXT,
  "excerpt" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrammarEvidence_userId_dedupeKey_key"
ON "GrammarEvidence"("userId", "dedupeKey");

CREATE INDEX "GrammarEvidence_userId_grammarConceptId_createdAt_idx"
ON "GrammarEvidence"("userId", "grammarConceptId", "createdAt");

CREATE INDEX "GrammarEvidence_grammarConceptId_outcome_createdAt_idx"
ON "GrammarEvidence"("grammarConceptId", "outcome", "createdAt");

CREATE INDEX "UserGrammarProgress_userId_lastEvidenceAt_idx"
ON "UserGrammarProgress"("userId", "lastEvidenceAt");

ALTER TABLE "GrammarEvidence"
ADD CONSTRAINT "GrammarEvidence_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrammarEvidence"
ADD CONSTRAINT "GrammarEvidence_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
