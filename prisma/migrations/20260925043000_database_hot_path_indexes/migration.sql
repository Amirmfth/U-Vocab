-- Indexes are based on current query shapes used by vocabulary, word detail,
-- mistake review, and writing/context selection.

CREATE INDEX "LexicalPattern_lexemeId_idx"
ON "LexicalPattern"("lexemeId");

CREATE INDEX "Example_lexemeId_idx"
ON "Example"("lexemeId");

CREATE INDEX "LexemeRelation_targetId_type_idx"
ON "LexemeRelation"("targetId", "type");

CREATE INDEX "UserVocabulary_userId_addedAt_idx"
ON "UserVocabulary"("userId", "addedAt");

CREATE INDEX "Mistake_userId_resolvedAt_lastOccurredAt_idx"
ON "Mistake"("userId", "resolvedAt", "lastOccurredAt");


CREATE INDEX "TopicPackItem_lexemeId_idx"
ON "TopicPackItem"("lexemeId");
