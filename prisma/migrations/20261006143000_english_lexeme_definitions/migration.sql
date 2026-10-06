-- Add a first-class sense definition model.
-- Definitions may use the target language (for example an English definition
-- of an English lexeme); Translation remains reserved for cross-language text.

CREATE TABLE "LexemeDefinition" (
  "id" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "senseId" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LexemeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LexemeDefinition_senseId_language_key"
  ON "LexemeDefinition"("senseId", "language");

CREATE INDEX "LexemeDefinition_lexemeId_language_idx"
  ON "LexemeDefinition"("lexemeId", "language");

ALTER TABLE "LexemeDefinition"
  ADD CONSTRAINT "LexemeDefinition_lexemeId_fkey"
  FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LexemeDefinition"
  ADD CONSTRAINT "LexemeDefinition_senseId_fkey"
  FOREIGN KEY ("senseId") REFERENCES "LexemeSense"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing German/French translation rows are intentionally untouched.
-- No translation is reclassified automatically because existing rows are
-- cross-language learner data and must remain stable.
