-- Introduce course-scoped learner state. Existing installations are German-only,
-- so every current learner is backfilled into one German course before the
-- legacy account-global learning settings are removed.

CREATE TYPE "TargetLanguage" AS ENUM ('GERMAN', 'FRENCH', 'ENGLISH');
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "UserCourse" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetLanguage" "TargetLanguage" NOT NULL,
  "currentLevel" "CefrLevel" NOT NULL DEFAULT 'A1',
  "targetLevel" "CefrLevel" NOT NULL DEFAULT 'B2',
  "explanationLanguage" "TranslationLanguage" NOT NULL DEFAULT 'ENGLISH',
  "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCourse_userId_targetLanguage_key" ON "UserCourse"("userId", "targetLanguage");
CREATE INDEX "UserCourse_userId_status_idx" ON "UserCourse"("userId", "status");

ALTER TABLE "User" ADD COLUMN "activeCourseId" TEXT;

INSERT INTO "UserCourse" (
  "id", "userId", "targetLanguage", "currentLevel", "targetLevel",
  "explanationLanguage", "status"
)
SELECT
  CONCAT('course_', "id", '_de'),
  "id",
  'GERMAN'::"TargetLanguage",
  "currentLevel",
  "targetLevel",
  "preferredTranslation",
  'ACTIVE'::"CourseStatus"
FROM "User"
ON CONFLICT ("userId", "targetLanguage") DO NOTHING;

UPDATE "User"
SET "activeCourseId" = course."id"
FROM "UserCourse" course
WHERE course."userId" = "User"."id"
  AND course."targetLanguage" = 'GERMAN';

CREATE UNIQUE INDEX "User_activeCourseId_key" ON "User"("activeCourseId");

ALTER TABLE "UserCourse"
  ADD CONSTRAINT "UserCourse_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_activeCourseId_fkey"
  FOREIGN KEY ("activeCourseId") REFERENCES "UserCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'UserGrammarProgress','GrammarEvidence','GrammarProgressTransition',
    'GrammarRecommendationEvent','UserVocabulary','Attempt','Mistake','Encounter',
    'TopicPack','Story','ReadingDocument','LearningSession','RecommendationFeedback',
    'ConfusionPair','ConversationSession','BattleSession','WritingSession'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN "userCourseId" TEXT', table_name);
    EXECUTE format(
      'UPDATE %I t SET "userCourseId" = u."activeCourseId" FROM "User" u WHERE t."userId" = u."id"',
      table_name
    );
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "userCourseId" SET NOT NULL', table_name);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      table_name, table_name || '_userCourseId_fkey'
    );
    EXECUTE format('CREATE INDEX %I ON %I ("userCourseId")', table_name || '_userCourseId_idx', table_name);
  END LOOP;
END $$;

ALTER TABLE "AIUsageEvent" ADD COLUMN "userCourseId" TEXT;
UPDATE "AIUsageEvent" event
SET "userCourseId" = u."activeCourseId"
FROM "User" u
WHERE event."userId" = u."id";
ALTER TABLE "AIUsageEvent"
  ADD CONSTRAINT "AIUsageEvent_userCourseId_fkey"
  FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AIUsageEvent_userCourseId_createdAt_idx" ON "AIUsageEvent"("userCourseId", "createdAt");

DROP INDEX IF EXISTS "UserVocabulary_userId_lexemeId_key";
CREATE UNIQUE INDEX "UserVocabulary_userCourseId_lexemeId_key" ON "UserVocabulary"("userCourseId", "lexemeId");

DROP INDEX IF EXISTS "UserGrammarProgress_userId_grammarConceptId_key";
CREATE UNIQUE INDEX "UserGrammarProgress_userCourseId_grammarConceptId_key" ON "UserGrammarProgress"("userCourseId", "grammarConceptId");

DROP INDEX IF EXISTS "GrammarEvidence_userId_dedupeKey_key";
CREATE UNIQUE INDEX "GrammarEvidence_userCourseId_dedupeKey_key" ON "GrammarEvidence"("userCourseId", "dedupeKey");

DROP INDEX IF EXISTS "Encounter_userId_lexemeId_source_sourceRef_key";
CREATE UNIQUE INDEX "Encounter_userCourseId_lexemeId_source_sourceRef_key" ON "Encounter"("userCourseId", "lexemeId", "source", "sourceRef");

DROP INDEX IF EXISTS "RecommendationFeedback_userId_lexemeId_key";
CREATE UNIQUE INDEX "RecommendationFeedback_userCourseId_lexemeId_key" ON "RecommendationFeedback"("userCourseId", "lexemeId");

DROP INDEX IF EXISTS "ConfusionPair_userId_leftLexemeId_rightLexemeId_key";
CREATE UNIQUE INDEX "ConfusionPair_userCourseId_leftLexemeId_rightLexemeId_key" ON "ConfusionPair"("userCourseId", "leftLexemeId", "rightLexemeId");

ALTER TABLE "User"
  DROP COLUMN "preferredTranslation",
  DROP COLUMN "currentLevel",
  DROP COLUMN "targetLevel";
