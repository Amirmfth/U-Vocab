CREATE UNIQUE INDEX "Encounter_userId_lexemeId_source_sourceRef_key"
ON "Encounter"("userId", "lexemeId", "source", "sourceRef");
