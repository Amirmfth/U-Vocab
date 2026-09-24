CREATE TABLE "TopicPack" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TopicPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TopicPackItem" (
  "id" TEXT NOT NULL,
  "topicPackId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "rationale" TEXT,
  "usefulness" INTEGER NOT NULL DEFAULT 3,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TopicPackItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Story" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT,
  "level" TEXT NOT NULL,
  "length" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "englishSummary" TEXT,
  "persianSummary" TEXT,
  "questions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryTarget" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StoryTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TopicPack_userId_createdAt_idx" ON "TopicPack"("userId", "createdAt");
CREATE UNIQUE INDEX "TopicPackItem_topicPackId_lexemeId_key" ON "TopicPackItem"("topicPackId", "lexemeId");
CREATE INDEX "TopicPackItem_topicPackId_position_idx" ON "TopicPackItem"("topicPackId", "position");
CREATE INDEX "Story_userId_createdAt_idx" ON "Story"("userId", "createdAt");
CREATE UNIQUE INDEX "StoryTarget_storyId_lexemeId_key" ON "StoryTarget"("storyId", "lexemeId");
CREATE INDEX "StoryTarget_storyId_position_idx" ON "StoryTarget"("storyId", "position");

ALTER TABLE "TopicPack" ADD CONSTRAINT "TopicPack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicPackItem" ADD CONSTRAINT "TopicPackItem_topicPackId_fkey" FOREIGN KEY ("topicPackId") REFERENCES "TopicPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TopicPackItem" ADD CONSTRAINT "TopicPackItem_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryTarget" ADD CONSTRAINT "StoryTarget_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryTarget" ADD CONSTRAINT "StoryTarget_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
