CREATE TABLE "ReadingDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'PASTED_TEXT',
  "sourceRef" TEXT,
  "content" TEXT NOT NULL,
  "level" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReadingDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReadingItem" (
  "id" TEXT NOT NULL,
  "readingDocumentId" TEXT NOT NULL,
  "lexemeId" TEXT NOT NULL,
  "surfaceText" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ReadingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadingDocument_userId_createdAt_idx" ON "ReadingDocument"("userId", "createdAt");
CREATE UNIQUE INDEX "ReadingItem_readingDocumentId_lexemeId_key" ON "ReadingItem"("readingDocumentId", "lexemeId");
CREATE INDEX "ReadingItem_readingDocumentId_position_idx" ON "ReadingItem"("readingDocumentId", "position");

ALTER TABLE "ReadingDocument"
ADD CONSTRAINT "ReadingDocument_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadingItem"
ADD CONSTRAINT "ReadingItem_readingDocumentId_fkey"
FOREIGN KEY ("readingDocumentId") REFERENCES "ReadingDocument"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReadingItem"
ADD CONSTRAINT "ReadingItem_lexemeId_fkey"
FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
