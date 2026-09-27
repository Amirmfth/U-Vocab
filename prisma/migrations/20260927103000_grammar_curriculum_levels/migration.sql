CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE "GrammarCategory" AS ENUM (
  'SENTENCE_STRUCTURE',
  'CASES',
  'VERBS',
  'TENSES',
  'ARTICLES',
  'ADJECTIVES',
  'PREPOSITIONS',
  'PRONOUNS',
  'CONJUNCTIONS',
  'RELATIVE_CLAUSES',
  'NEGATION',
  'COMPARISON',
  'PASSIVE',
  'SUBJUNCTIVE',
  'INFINITIVE_CONSTRUCTIONS',
  'NOUNS'
);
CREATE TYPE "GrammarRelationType" AS ENUM ('RELATED', 'CONTRASTS_WITH', 'EXTENDS');
CREATE TYPE "GrammarProgressStatus" AS ENUM ('UNASSESSED', 'ASSUMED', 'LEARNING', 'STRONG', 'NEEDS_ATTENTION');
CREATE TYPE "GrammarProgressSource" AS ENUM ('DECLARED_LEVEL', 'EVIDENCE', 'MANUAL');

-- Existing U-Vocab deployments are currently single-user and the existing learner
-- is B1. Preserve that existing-user assumption while keeping new-user defaults A1.
ALTER TABLE "User"
ADD COLUMN "currentLevel" "CefrLevel" NOT NULL DEFAULT 'B1';

UPDATE "User"
SET "targetLevel" = 'B2'
WHERE "targetLevel" NOT IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

ALTER TABLE "User"
ALTER COLUMN "targetLevel" DROP DEFAULT,
ALTER COLUMN "targetLevel" TYPE "CefrLevel" USING ("targetLevel"::"CefrLevel"),
ALTER COLUMN "targetLevel" SET DEFAULT 'B2',
ALTER COLUMN "currentLevel" SET DEFAULT 'A1';

CREATE TABLE "GrammarConcept" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'de',
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "category" "GrammarCategory" NOT NULL,
  "introducedAt" "CefrLevel" NOT NULL,
  "expectedBy" "CefrLevel",
  "reinforcedAt" "CefrLevel"[] NOT NULL,
  "order" INTEGER NOT NULL,
  "contentVersion" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "explanation" TEXT,
  "rules" JSONB,
  "exceptions" JSONB,
  "examples" JSONB,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarConcept_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrammarPrerequisite" (
  "id" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "prerequisiteId" TEXT NOT NULL,
  CONSTRAINT "GrammarPrerequisite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrammarConceptRelation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "type" "GrammarRelationType" NOT NULL DEFAULT 'RELATED',
  CONSTRAINT "GrammarConceptRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGrammarProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "status" "GrammarProgressStatus" NOT NULL DEFAULT 'UNASSESSED',
  "source" "GrammarProgressSource" NOT NULL DEFAULT 'DECLARED_LEVEL',
  "assumedFromLevel" "CefrLevel",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserGrammarProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrammarConcept_slug_key" ON "GrammarConcept"("slug");
CREATE INDEX "GrammarConcept_language_category_order_idx" ON "GrammarConcept"("language", "category", "order");
CREATE INDEX "GrammarConcept_introducedAt_expectedBy_idx" ON "GrammarConcept"("introducedAt", "expectedBy");
CREATE INDEX "GrammarConcept_parentId_order_idx" ON "GrammarConcept"("parentId", "order");

CREATE UNIQUE INDEX "GrammarPrerequisite_conceptId_prerequisiteId_key" ON "GrammarPrerequisite"("conceptId", "prerequisiteId");
CREATE INDEX "GrammarPrerequisite_prerequisiteId_idx" ON "GrammarPrerequisite"("prerequisiteId");

CREATE UNIQUE INDEX "GrammarConceptRelation_sourceId_targetId_type_key" ON "GrammarConceptRelation"("sourceId", "targetId", "type");
CREATE INDEX "GrammarConceptRelation_targetId_type_idx" ON "GrammarConceptRelation"("targetId", "type");

CREATE UNIQUE INDEX "UserGrammarProgress_userId_grammarConceptId_key" ON "UserGrammarProgress"("userId", "grammarConceptId");
CREATE INDEX "UserGrammarProgress_userId_status_idx" ON "UserGrammarProgress"("userId", "status");
CREATE INDEX "UserGrammarProgress_grammarConceptId_status_idx" ON "UserGrammarProgress"("grammarConceptId", "status");

ALTER TABLE "GrammarConcept"
ADD CONSTRAINT "GrammarConcept_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "GrammarConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrammarPrerequisite"
ADD CONSTRAINT "GrammarPrerequisite_conceptId_fkey"
FOREIGN KEY ("conceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrammarPrerequisite"
ADD CONSTRAINT "GrammarPrerequisite_prerequisiteId_fkey"
FOREIGN KEY ("prerequisiteId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrammarConceptRelation"
ADD CONSTRAINT "GrammarConceptRelation_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrammarConceptRelation"
ADD CONSTRAINT "GrammarConceptRelation_targetId_fkey"
FOREIGN KEY ("targetId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGrammarProgress"
ADD CONSTRAINT "UserGrammarProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGrammarProgress"
ADD CONSTRAINT "UserGrammarProgress_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
