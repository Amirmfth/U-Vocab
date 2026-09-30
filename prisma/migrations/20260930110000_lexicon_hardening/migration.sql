CREATE TYPE "LexemeAliasKind" AS ENUM (
  'USER_INPUT',
  'ARTICLE_VARIANT',
  'SPELLING_VARIANT',
  'INFLECTED_FORM',
  'IMPORTED',
  'GENERATED'
);

CREATE TYPE "LexemeDataSource" AS ENUM (
  'CURATED',
  'IMPORTED',
  'AI_GENERATED',
  'USER_CONFIRMED'
);

CREATE TYPE "LexemeReviewState" AS ENUM (
  'UNREVIEWED',
  'ACCEPTED',
  'FLAGGED',
  'CURATED'
);

ALTER TABLE "Lexeme"
ADD COLUMN "canonicalUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Translation"
ADD COLUMN "senseId" TEXT;

CREATE TABLE "LexemeSense" (
  "id" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'default',
  "gloss" TEXT,
  "source" "LexemeDataSource" NOT NULL DEFAULT 'IMPORTED',
  "reviewState" "LexemeReviewState" NOT NULL DEFAULT 'UNREVIEWED',
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LexemeSense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LexemeAlias" (
  "id" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "normalizedSurface" TEXT NOT NULL,
  "kind" "LexemeAliasKind" NOT NULL,
  "source" "LexemeDataSource" NOT NULL DEFAULT 'IMPORTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LexemeAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LexemeProvenance" (
  "id" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "senseId" TEXT,
  "source" "LexemeDataSource" NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "promptVersion" TEXT,
  "contentVersion" TEXT,
  "confidence" DOUBLE PRECISION,
  "reviewState" "LexemeReviewState" NOT NULL DEFAULT 'UNREVIEWED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LexemeProvenance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LexemeSense_lexemeId_key_key"
ON "LexemeSense"("lexemeId", "key");

CREATE INDEX "LexemeSense_lexemeId_reviewState_idx"
ON "LexemeSense"("lexemeId", "reviewState");

CREATE UNIQUE INDEX "LexemeAlias_language_normalizedSurface_lexemeId_key"
ON "LexemeAlias"("language", "normalizedSurface", "lexemeId");

CREATE INDEX "LexemeAlias_language_normalizedSurface_idx"
ON "LexemeAlias"("language", "normalizedSurface");

CREATE INDEX "LexemeAlias_lexemeId_kind_idx"
ON "LexemeAlias"("lexemeId", "kind");

CREATE INDEX "LexemeProvenance_lexemeId_createdAt_idx"
ON "LexemeProvenance"("lexemeId", "createdAt");

CREATE INDEX "LexemeProvenance_senseId_idx"
ON "LexemeProvenance"("senseId");

CREATE INDEX "LexemeProvenance_source_reviewState_idx"
ON "LexemeProvenance"("source", "reviewState");

CREATE INDEX "Translation_senseId_language_idx"
ON "Translation"("senseId", "language");

ALTER TABLE "LexemeSense"
ADD CONSTRAINT "LexemeSense_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LexemeAlias"
ADD CONSTRAINT "LexemeAlias_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LexemeProvenance"
ADD CONSTRAINT "LexemeProvenance_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LexemeProvenance"
ADD CONSTRAINT "LexemeProvenance_senseId_fkey"
FOREIGN KEY ("senseId") REFERENCES "LexemeSense"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Translation"
ADD CONSTRAINT "Translation_senseId_fkey"
FOREIGN KEY ("senseId") REFERENCES "LexemeSense"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "LexemeSense" (
  "id",
  "lexemeId",
  "key",
  "source",
  "reviewState",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-sense-' || md5("id"),
  "id",
  'default',
  'IMPORTED'::"LexemeDataSource",
  'ACCEPTED'::"LexemeReviewState",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "Lexeme"
ON CONFLICT ("lexemeId", "key") DO NOTHING;

UPDATE "Translation" AS t
SET "senseId" = s."id"
FROM "LexemeSense" AS s
WHERE s."lexemeId" = t."lexemeId"
  AND s."key" = 'default'
  AND t."senseId" IS NULL;

INSERT INTO "LexemeAlias" (
  "id",
  "lexemeId",
  "language",
  "surface",
  "normalizedSurface",
  "kind",
  "source",
  "createdAt"
)
SELECT
  'legacy-alias-' || md5("id"),
  "id",
  "language",
  "lemma",
  "normalized",
  'IMPORTED'::"LexemeAliasKind",
  'IMPORTED'::"LexemeDataSource",
  COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "Lexeme"
ON CONFLICT ("language", "normalizedSurface", "lexemeId") DO NOTHING;

INSERT INTO "LexemeProvenance" (
  "id",
  "lexemeId",
  "senseId",
  "source",
  "reviewState",
  "createdAt"
)
SELECT
  'legacy-prov-' || md5(l."id"),
  l."id",
  s."id",
  'IMPORTED'::"LexemeDataSource",
  'ACCEPTED'::"LexemeReviewState",
  COALESCE(l."createdAt", CURRENT_TIMESTAMP)
FROM "Lexeme" AS l
JOIN "LexemeSense" AS s
  ON s."lexemeId" = l."id"
 AND s."key" = 'default'
ON CONFLICT DO NOTHING;
