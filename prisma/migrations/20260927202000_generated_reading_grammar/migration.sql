ALTER TABLE "Story"
ADD COLUMN "generationMeta" JSONB,
ADD COLUMN "answers" JSONB,
ADD COLUMN "comprehensionScore" DOUBLE PRECISION,
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "StoryGrammarTarget" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "excerpt" TEXT,
  "explanation" TEXT,
  "intentional" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StoryGrammarTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoryGrammarTarget_storyId_grammarConceptId_excerpt_key"
ON "StoryGrammarTarget"("storyId","grammarConceptId","excerpt");

CREATE INDEX "StoryGrammarTarget_storyId_position_idx"
ON "StoryGrammarTarget"("storyId","position");

CREATE INDEX "StoryGrammarTarget_grammarConceptId_storyId_idx"
ON "StoryGrammarTarget"("grammarConceptId","storyId");

ALTER TABLE "StoryGrammarTarget"
ADD CONSTRAINT "StoryGrammarTarget_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryGrammarTarget"
ADD CONSTRAINT "StoryGrammarTarget_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
