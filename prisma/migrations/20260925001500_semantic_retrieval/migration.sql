CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Lexeme"
ADD COLUMN "embedding" vector(1536),
ADD COLUMN "embeddingModel" TEXT,
ADD COLUMN "embeddingVersion" INTEGER,
ADD COLUMN "embeddedAt" TIMESTAMP(3);

ALTER TABLE "Mistake"
ADD COLUMN "embedding" vector(1536),
ADD COLUMN "embeddingModel" TEXT,
ADD COLUMN "embeddingVersion" INTEGER,
ADD COLUMN "embeddedAt" TIMESTAMP(3);

CREATE INDEX "Lexeme_embedding_hnsw_idx"
ON "Lexeme" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "Mistake_embedding_hnsw_idx"
ON "Mistake" USING hnsw ("embedding" vector_cosine_ops);

CREATE TYPE "RecommendationAction" AS ENUM ('ADDED', 'DISMISSED');

CREATE TABLE "RecommendationFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "action" "RecommendationAction" NOT NULL,
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecommendationFeedback_userId_lexemeId_key"
ON "RecommendationFeedback"("userId", "lexemeId");

CREATE INDEX "RecommendationFeedback_userId_action_createdAt_idx"
ON "RecommendationFeedback"("userId", "action", "createdAt");

ALTER TABLE "RecommendationFeedback"
ADD CONSTRAINT "RecommendationFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecommendationFeedback"
ADD CONSTRAINT "RecommendationFeedback_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
