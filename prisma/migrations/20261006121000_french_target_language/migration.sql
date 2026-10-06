-- Generalize target-language-specific storage without changing existing German data.
ALTER TABLE "Example" RENAME COLUMN "german" TO "targetText";
ALTER TABLE "LexemeInsight" RENAME COLUMN "germanDefinition" TO "targetDefinition";
