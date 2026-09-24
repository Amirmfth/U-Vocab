-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "VocabularyState" AS ENUM ('NEW', 'LEARNING', 'FAMILIAR', 'ACTIVE', 'MASTERED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TranslationLanguage" AS ENUM ('ENGLISH', 'PERSIAN', 'BOTH');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('WORD_FAMILY', 'SYNONYM', 'ANTONYM', 'DERIVED', 'RELATED', 'COLLOCATION', 'PHRASE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "preferredTranslation" "TranslationLanguage" NOT NULL DEFAULT 'ENGLISH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lexeme" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "partOfSpeech" "PartOfSpeech" NOT NULL,
    "article" TEXT,
    "gender" TEXT,
    "plural" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lexeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexicalPattern" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "LexicalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "german" TEXT NOT NULL,
    "english" TEXT,
    "persian" TEXT,
    "level" TEXT,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexemeRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,

    CONSTRAINT "LexemeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabulary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "state" "VocabularyState" NOT NULL DEFAULT 'NEW',
    "recognition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meaningRecall" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "production" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listening" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contextualUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION,
    "stability" DOUBLE PRECISION,
    "retrievability" DOUBLE PRECISION,
    "nextReviewAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lexeme_lemma_idx" ON "Lexeme"("lemma");

-- CreateIndex
CREATE UNIQUE INDEX "Lexeme_language_normalized_partOfSpeech_key" ON "Lexeme"("language", "normalized", "partOfSpeech");

-- CreateIndex
CREATE INDEX "Translation_lexemeId_language_idx" ON "Translation"("lexemeId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "LexemeRelation_sourceId_targetId_type_key" ON "LexemeRelation"("sourceId", "targetId", "type");

-- CreateIndex
CREATE INDEX "UserVocabulary_userId_state_idx" ON "UserVocabulary"("userId", "state");

-- CreateIndex
CREATE INDEX "UserVocabulary_userId_nextReviewAt_idx" ON "UserVocabulary"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabulary_userId_lexemeId_key" ON "UserVocabulary"("userId", "lexemeId");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalPattern" ADD CONSTRAINT "LexicalPattern_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexemeRelation" ADD CONSTRAINT "LexemeRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexemeRelation" ADD CONSTRAINT "LexemeRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
