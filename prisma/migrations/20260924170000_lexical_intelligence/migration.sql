ALTER TABLE "User"
ADD COLUMN "targetLevel" TEXT NOT NULL DEFAULT 'B2';

CREATE TABLE "LexemeInsight" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "germanDefinition" TEXT NOT NULL,
    "englishExplanation" TEXT NOT NULL,
    "persianExplanation" TEXT NOT NULL,
    "grammarNotes" TEXT NOT NULL,
    "comparisonTarget" TEXT,
    "comparisonNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LexemeInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LexemeInsight_lexemeId_level_key"
ON "LexemeInsight"("lexemeId", "level");

CREATE INDEX "LexemeInsight_lexemeId_updatedAt_idx"
ON "LexemeInsight"("lexemeId", "updatedAt");

ALTER TABLE "LexemeInsight"
ADD CONSTRAINT "LexemeInsight_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
