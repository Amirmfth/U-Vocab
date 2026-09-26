ALTER TABLE "Lexeme" ADD COLUMN "cefrLevel" TEXT;

CREATE INDEX "Lexeme_cefrLevel_idx" ON "Lexeme"("cefrLevel");
