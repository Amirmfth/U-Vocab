ALTER TABLE "GrammarLesson" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

UPDATE "GrammarLesson"
SET "examples" = (
  SELECT jsonb_agg((example - 'english') || jsonb_build_object('translation', example->'english') ORDER BY position)
  FROM jsonb_array_elements("examples") WITH ORDINALITY AS items(example, position)
);

DROP INDEX "GrammarLesson_grammarConceptId_key";
CREATE UNIQUE INDEX "GrammarLesson_grammarConceptId_language_key"
ON "GrammarLesson"("grammarConceptId", "language");
