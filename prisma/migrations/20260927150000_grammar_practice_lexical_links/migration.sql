ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'GRAMMAR_CHOICE';
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'GRAMMAR_CLOZE';
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'GRAMMAR_REORDER';
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'GRAMMAR_CORRECTION';

ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'ADJECTIVE_ENDING';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'VERB_POSITION';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'WORD_ORDER';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'TENSE';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'CONJUGATION';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'PRONOUN';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'AGREEMENT';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'RELATIVE_CLAUSE';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'PASSIVE';
ALTER TYPE "MistakeType" ADD VALUE IF NOT EXISTS 'SUBJUNCTIVE';

CREATE TYPE "LexemeGrammarRelationType" AS ENUM ('EXEMPLIFIES','GOVERNS','TRIGGERS','COMMON_WITH');
CREATE TYPE "LexemeGrammarLinkSource" AS ENUM ('DETERMINISTIC','AI','MANUAL');

CREATE TABLE "LexemeGrammarConcept" (
  "id" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "lexicalPatternId" TEXT,
  "relationType" "LexemeGrammarRelationType" NOT NULL DEFAULT 'EXEMPLIFIES',
  "note" TEXT,
  "source" "LexemeGrammarLinkSource" NOT NULL DEFAULT 'DETERMINISTIC',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LexemeGrammarConcept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LexemeGrammarConcept_lexemeId_grammarConceptId_relationType_key"
ON "LexemeGrammarConcept"("lexemeId","grammarConceptId","relationType");
CREATE INDEX "LexemeGrammarConcept_grammarConceptId_lexemeId_idx"
ON "LexemeGrammarConcept"("grammarConceptId","lexemeId");
CREATE INDEX "LexemeGrammarConcept_lexicalPatternId_idx"
ON "LexemeGrammarConcept"("lexicalPatternId");

ALTER TABLE "Attempt" ADD COLUMN "grammarConceptId" TEXT;
CREATE INDEX "Attempt_userId_grammarConceptId_createdAt_idx"
ON "Attempt"("userId","grammarConceptId","createdAt");

ALTER TABLE "Mistake" ADD COLUMN "grammarConceptId" TEXT;
CREATE INDEX "Mistake_userId_grammarConceptId_resolvedAt_lastOccurredAt_idx"
ON "Mistake"("userId","grammarConceptId","resolvedAt","lastOccurredAt");

ALTER TABLE "LexemeGrammarConcept"
ADD CONSTRAINT "LexemeGrammarConcept_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LexemeGrammarConcept"
ADD CONSTRAINT "LexemeGrammarConcept_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LexemeGrammarConcept"
ADD CONSTRAINT "LexemeGrammarConcept_lexicalPatternId_fkey"
FOREIGN KEY ("lexicalPatternId") REFERENCES "LexicalPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mistake"
ADD CONSTRAINT "Mistake_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
