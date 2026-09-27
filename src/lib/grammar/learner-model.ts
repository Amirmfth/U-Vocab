import {
  GrammarProgressSource,
  type GrammarEvidenceDimension,
  type GrammarEvidenceOutcome,
  type GrammarEvidenceSource,
  type GrammarProgressStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  calculateGrammarProfile,
  evaluateGrammarEvidencePolicy,
  type GrammarStatusCode,
} from "@/lib/grammar/learner-policy";

export type RecordGrammarEvidenceInput = {
  userId: string;
  grammarConceptId: string;
  source: GrammarEvidenceSource;
  outcome: GrammarEvidenceOutcome;
  dimension: GrammarEvidenceDimension;
  dedupeKey: string;
  strength?: number;
  confidence?: number;
  sourceRef?: string | null;
  excerpt?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recomputeGrammarProgress(
  userId: string,
  grammarConceptId: string,
) {
  const [existing, evidence] = await Promise.all([
    db.userGrammarProgress.findUnique({
      where: { userId_grammarConceptId: { userId, grammarConceptId } },
    }),
    db.grammarEvidence.findMany({
      where: { userId, grammarConceptId },
      select: {
        outcome: true,
        dimension: true,
        effectiveWeight: true,
        accepted: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const previousStatus = (existing?.status ?? "UNASSESSED") as GrammarStatusCode;
  const calculated = calculateGrammarProfile(previousStatus, evidence);
  const lastAccepted = await db.grammarEvidence.findFirst({
    where: {
      userId,
      grammarConceptId,
      accepted: true,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return db.userGrammarProgress.upsert({
    where: { userId_grammarConceptId: { userId, grammarConceptId } },
    create: {
      userId,
      grammarConceptId,
      status: calculated.status as GrammarProgressStatus,
      source:
        calculated.evidenceCount > 0
          ? GrammarProgressSource.EVIDENCE
          : GrammarProgressSource.DECLARED_LEVEL,
      understanding: calculated.understanding,
      controlledProduction: calculated.controlledProduction,
      freeProduction: calculated.freeProduction,
      evidenceCount: calculated.evidenceCount,
      lastEvidenceAt: lastAccepted?.createdAt ?? null,
    },
    update: {
      status: calculated.status as GrammarProgressStatus,
      ...(calculated.evidenceCount > 0
        ? { source: GrammarProgressSource.EVIDENCE }
        : {}),
      understanding: calculated.understanding,
      controlledProduction: calculated.controlledProduction,
      freeProduction: calculated.freeProduction,
      evidenceCount: calculated.evidenceCount,
      lastEvidenceAt: lastAccepted?.createdAt ?? null,
    },
  });
}

export async function recordGrammarEvidence(input: RecordGrammarEvidenceInput) {
  const concept = await db.grammarConcept.findFirst({
    where: { id: input.grammarConceptId, active: true },
    select: { id: true },
  });
  if (!concept) throw new Error("Unknown or inactive grammar concept.");

  const policy = evaluateGrammarEvidencePolicy({
    source: input.source,
    outcome: input.outcome,
    dimension: input.dimension,
    strength: input.strength,
    confidence: input.confidence,
  });

  try {
    await db.grammarEvidence.create({
      data: {
        userId: input.userId,
        grammarConceptId: input.grammarConceptId,
        source: input.source,
        outcome: input.outcome,
        dimension: input.dimension,
        strength: policy.strength,
        confidence: policy.confidence,
        effectiveWeight: policy.effectiveWeight,
        accepted: policy.accepted,
        dedupeKey: input.dedupeKey,
        sourceRef: input.sourceRef ?? null,
        excerpt: input.excerpt?.slice(0, 500) ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }
  }

  return recomputeGrammarProgress(input.userId, input.grammarConceptId);
}

export async function getGrammarEvidenceSummary(
  userId: string,
  grammarConceptId: string,
) {
  const [progress, recentEvidence] = await Promise.all([
    db.userGrammarProgress.findUnique({
      where: { userId_grammarConceptId: { userId, grammarConceptId } },
    }),
    db.grammarEvidence.findMany({
      where: { userId, grammarConceptId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return { progress, recentEvidence };
}
