CREATE TABLE "GrammarProgressTransition" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "fromStatus" "GrammarProgressStatus",
  "toStatus" "GrammarProgressStatus" NOT NULL,
  "source" "GrammarProgressSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarProgressTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrammarRecommendationEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grammarConceptId" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrammarRecommendationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrammarProgressTransition_userId_createdAt_idx"
ON "GrammarProgressTransition"("userId","createdAt");
CREATE INDEX "GrammarProgressTransition_userId_grammarConceptId_createdAt_idx"
ON "GrammarProgressTransition"("userId","grammarConceptId","createdAt");
CREATE INDEX "GrammarProgressTransition_grammarConceptId_toStatus_createdAt_idx"
ON "GrammarProgressTransition"("grammarConceptId","toStatus","createdAt");

CREATE INDEX "GrammarRecommendationEvent_userId_createdAt_idx"
ON "GrammarRecommendationEvent"("userId","createdAt");
CREATE INDEX "GrammarRecommendationEvent_userId_surface_reason_createdAt_idx"
ON "GrammarRecommendationEvent"("userId","surface","reason","createdAt");
CREATE INDEX "GrammarRecommendationEvent_grammarConceptId_action_createdAt_idx"
ON "GrammarRecommendationEvent"("grammarConceptId","action","createdAt");

ALTER TABLE "GrammarProgressTransition"
ADD CONSTRAINT "GrammarProgressTransition_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarProgressTransition"
ADD CONSTRAINT "GrammarProgressTransition_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarRecommendationEvent"
ADD CONSTRAINT "GrammarRecommendationEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrammarRecommendationEvent"
ADD CONSTRAINT "GrammarRecommendationEvent_grammarConceptId_fkey"
FOREIGN KEY ("grammarConceptId") REFERENCES "GrammarConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
