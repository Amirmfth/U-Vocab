CREATE TYPE "ConversationTone" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'PLAYFUL', 'DIRECT', 'SUPPORTIVE');
CREATE TYPE "ConversationFormality" AS ENUM ('CASUAL', 'NEUTRAL', 'FORMAL');

ALTER TABLE "ConversationSession"
ADD COLUMN "tone" "ConversationTone" NOT NULL DEFAULT 'FRIENDLY',
ADD COLUMN "formality" "ConversationFormality" NOT NULL DEFAULT 'NEUTRAL';
