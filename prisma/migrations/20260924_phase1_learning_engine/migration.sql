ALTER TYPE "PartOfSpeech" ADD VALUE IF NOT EXISTS 'PHRASE';

CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');
CREATE TYPE "ExerciseType" AS ENUM ('MEANING_RECALL', 'REVERSE_RECALL', 'CLOZE', 'COLLOCATION', 'ARTICLE', 'CASE_PREPOSITION', 'FREE_SENTENCE', 'PARAPHRASE', 'CONTEXTUAL_CHOICE');
CREATE TYPE "MistakeType" AS ENUM ('ARTICLE', 'CASE', 'PREPOSITION', 'REFLEXIVE', 'COLLOCATION', 'WORD_CHOICE', 'WORD_FORM', 'SPELLING', 'OTHER');

ALTER TABLE "UserVocabulary" ADD COLUMN "fsrsCard" JSONB;

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "userVocabularyId" TEXT NOT NULL,
  "rating" "ReviewRating" NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousCard" JSONB NOT NULL,
  "nextCard" JSONB NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userVocabularyId" TEXT,
  "exerciseType" "ExerciseType" NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "expected" TEXT,
  "correct" BOOLEAN NOT NULL,
  "score" DOUBLE PRECISION,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mistake" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lexemeId" TEXT,
  "type" "MistakeType" NOT NULL,
  "expected" TEXT,
  "actual" TEXT,
  "explanation" TEXT,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "lastOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Encounter" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceRef" TEXT,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Review_userVocabularyId_reviewedAt_idx" ON "Review"("userVocabularyId", "reviewedAt");
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");
CREATE INDEX "Mistake_userId_type_lastOccurredAt_idx" ON "Mistake"("userId", "type", "lastOccurredAt");
CREATE INDEX "Mistake_userId_lexemeId_type_idx" ON "Mistake"("userId", "lexemeId", "type");
CREATE INDEX "Encounter_userId_lexemeId_createdAt_idx" ON "Encounter"("userId", "lexemeId", "createdAt");

ALTER TABLE "Review" ADD CONSTRAINT "Review_userVocabularyId_fkey" FOREIGN KEY ("userVocabularyId") REFERENCES "UserVocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userVocabularyId_fkey" FOREIGN KEY ("userVocabularyId") REFERENCES "UserVocabulary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
