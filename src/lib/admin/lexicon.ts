import "server-only";

import {
  LexemeAliasKind,
  LexemeDataSource,
  LexemeReviewState,
  Prisma,
  type PartOfSpeech,
} from "@prisma/client";
import { db } from "@/lib/db";
import { lexiconAdapter } from "@/lib/lexicon/normalization";
import { requireAdmin } from "./auth";
import { createAdminRequestId } from "./request-id";

type LexemePatch = {
  lemma?: string;
  article?: string | null;
  plural?: string | null;
  gender?: string | null;
  cefrLevel?: string | null;
  partOfSpeech?: PartOfSpeech;
};

export async function updateLexemeAsAdmin(lexemeId: string, patch: LexemePatch) {
  const admin = await requireAdmin();
  const requestId = createAdminRequestId();
  return db.$transaction(async (tx) => {
    const before = await tx.lexeme.findUnique({ where: { id: lexemeId } });
    if (!before) throw new Error("Lexeme not found.");

    const lemma = patch.lemma?.trim() || before.lemma;
    const partOfSpeech = patch.partOfSpeech ?? before.partOfSpeech;
    const adapter = lexiconAdapter("GERMAN");
    const normalized = adapter.normalizeCanonical(lemma, partOfSpeech).normalizedCanonical;

    const after = await tx.lexeme.update({
      where: { id: lexemeId },
      data: {
        lemma,
        normalized,
        partOfSpeech,
        article: patch.article === undefined ? before.article : patch.article?.trim() || null,
        plural: patch.plural === undefined ? before.plural : patch.plural?.trim() || null,
        gender: patch.gender === undefined ? before.gender : patch.gender?.trim() || null,
        cefrLevel: patch.cefrLevel === undefined ? before.cefrLevel : patch.cefrLevel?.trim() || null,
        canonicalUpdatedAt: new Date(),
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.edited",
        targetType: "lexeme",
        targetId: lexemeId,
        requestId,
        metadata: {
          before: {
            lemma: before.lemma,
            normalized: before.normalized,
            article: before.article,
            plural: before.plural,
            gender: before.gender,
            cefrLevel: before.cefrLevel,
            partOfSpeech: before.partOfSpeech,
          },
          after: {
            lemma: after.lemma,
            normalized: after.normalized,
            article: after.article,
            plural: after.plural,
            gender: after.gender,
            cefrLevel: after.cefrLevel,
            partOfSpeech: after.partOfSpeech,
          },
        },
      },
    });
    return after;
  });
}

export async function addLexemeAliasAsAdmin(input: {
  lexemeId: string;
  surface: string;
  kind?: LexemeAliasKind;
}) {
  const admin = await requireAdmin();
  const surface = input.surface.trim();
  if (!surface) throw new Error("Alias surface is required.");
  const requestId = createAdminRequestId();

  return db.$transaction(async (tx) => {
    const lexeme = await tx.lexeme.findUnique({ where: { id: input.lexemeId } });
    if (!lexeme) throw new Error("Lexeme not found.");
    const adapter = lexiconAdapter("GERMAN");
    const normalizedSurface = adapter.normalize(surface).normalizedLookup;
    const collision = await tx.lexemeAlias.findFirst({
      where: {
        language: lexeme.language,
        normalizedSurface,
        NOT: { lexemeId: lexeme.id },
      },
      select: { lexemeId: true },
    });
    if (collision) throw new Error("Alias collides with another lexeme.");

    const alias = await tx.lexemeAlias.upsert({
      where: {
        language_normalizedSurface_lexemeId: {
          language: lexeme.language,
          normalizedSurface,
          lexemeId: lexeme.id,
        },
      },
      create: {
        lexemeId: lexeme.id,
        language: lexeme.language,
        surface,
        normalizedSurface,
        kind: input.kind ?? LexemeAliasKind.SPELLING_VARIANT,
        source: LexemeDataSource.CURATED,
      },
      update: { surface, kind: input.kind ?? LexemeAliasKind.SPELLING_VARIANT },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.alias_added",
        targetType: "lexeme",
        targetId: lexeme.id,
        requestId,
        metadata: { aliasId: alias.id, normalizedSurface, kind: alias.kind },
      },
    });
    return alias;
  });
}

export async function removeLexemeAliasAsAdmin(aliasId: string) {
  const admin = await requireAdmin();
  const requestId = createAdminRequestId();
  return db.$transaction(async (tx) => {
    const alias = await tx.lexemeAlias.findUnique({ where: { id: aliasId } });
    if (!alias) throw new Error("Alias not found.");
    await tx.lexemeAlias.delete({ where: { id: alias.id } });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.alias_removed",
        targetType: "lexeme",
        targetId: alias.lexemeId,
        requestId,
        metadata: { aliasId: alias.id, normalizedSurface: alias.normalizedSurface, kind: alias.kind },
      },
    });
  });
}

export async function setLexemeReviewStateAsAdmin(
  lexemeId: string,
  reviewState: LexemeReviewState,
) {
  const admin = await requireAdmin();
  const requestId = createAdminRequestId();
  return db.$transaction(async (tx) => {
    const lexeme = await tx.lexeme.findUnique({ where: { id: lexemeId }, select: { id: true } });
    if (!lexeme) throw new Error("Lexeme not found.");
    const updated = await tx.lexemeProvenance.updateMany({
      where: { lexemeId },
      data: { reviewState },
    });
    await tx.lexemeSense.updateMany({
      where: { lexemeId },
      data: {
        reviewState,
        ...(reviewState === LexemeReviewState.CURATED ? { source: LexemeDataSource.CURATED } : {}),
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.review_state_changed",
        targetType: "lexeme",
        targetId: lexemeId,
        requestId,
        metadata: { reviewState, provenanceRows: updated.count },
      },
    });
    return updated.count;
  });
}

async function mergeUserVocabulary(
  tx: Prisma.TransactionClient,
  sourceLexemeId: string,
  targetLexemeId: string,
) {
  const sourceRows = await tx.userVocabulary.findMany({ where: { lexemeId: sourceLexemeId } });
  for (const source of sourceRows) {
    const target = await tx.userVocabulary.findUnique({
      where: {
        userCourseId_lexemeId: {
          userCourseId: source.userCourseId,
          lexemeId: targetLexemeId,
        },
      },
    });
    if (!target) {
      await tx.userVocabulary.update({ where: { id: source.id }, data: { lexemeId: targetLexemeId } });
      continue;
    }
    await tx.review.updateMany({ where: { userVocabularyId: source.id }, data: { userVocabularyId: target.id } });
    await tx.attempt.updateMany({ where: { userVocabularyId: source.id }, data: { userVocabularyId: target.id } });
    await tx.userVocabulary.update({
      where: { id: target.id },
      data: {
        recognition: Math.max(target.recognition, source.recognition),
        meaningRecall: Math.max(target.meaningRecall, source.meaningRecall),
        production: Math.max(target.production, source.production),
        listening: Math.max(target.listening, source.listening),
        contextualUsage: Math.max(target.contextualUsage, source.contextualUsage),
        masteredAt: target.masteredAt ?? source.masteredAt,
        nextReviewAt:
          target.nextReviewAt && source.nextReviewAt
            ? new Date(Math.min(target.nextReviewAt.getTime(), source.nextReviewAt.getTime()))
            : target.nextReviewAt ?? source.nextReviewAt,
      },
    });
    await tx.userVocabulary.delete({ where: { id: source.id } });
  }
}

export async function mergeLexemesAsAdmin(sourceLexemeId: string, targetLexemeId: string) {
  const admin = await requireAdmin();
  if (sourceLexemeId === targetLexemeId) throw new Error("Choose two different lexemes.");
  const requestId = createAdminRequestId();

  return db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.lexeme.findUnique({ where: { id: sourceLexemeId } }),
      tx.lexeme.findUnique({ where: { id: targetLexemeId } }),
    ]);
    if (!source || !target) throw new Error("Lexeme not found.");
    if (source.language !== target.language) throw new Error("Lexeme languages must match.");

    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.merge_initiated",
        targetType: "lexeme",
        targetId: target.id,
        requestId,
        metadata: { sourceLexemeId, targetLexemeId },
      },
    });

    await mergeUserVocabulary(tx, source.id, target.id);

    // De-duplicate composite-owned records before repointing them.
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "LexemeAlias" s
      USING "LexemeAlias" t
      WHERE s."lexemeId" = ${source.id}
        AND t."lexemeId" = ${target.id}
        AND s."language" = t."language"
        AND s."normalizedSurface" = t."normalizedSurface"
    `);
    await tx.lexemeAlias.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });

    const sourceSenses = await tx.lexemeSense.findMany({ where: { lexemeId: source.id } });
    for (const sense of sourceSenses) {
      const existing = await tx.lexemeSense.findUnique({
        where: { lexemeId_key: { lexemeId: target.id, key: sense.key } },
      });
      if (existing) {
        await tx.translation.updateMany({ where: { senseId: sense.id }, data: { senseId: existing.id, lexemeId: target.id } });
        await tx.lexemeProvenance.updateMany({ where: { senseId: sense.id }, data: { senseId: existing.id, lexemeId: target.id } });
        await tx.lexemeSense.delete({ where: { id: sense.id } });
      } else {
        await tx.lexemeSense.update({ where: { id: sense.id }, data: { lexemeId: target.id } });
        await tx.translation.updateMany({ where: { senseId: sense.id }, data: { lexemeId: target.id } });
        await tx.lexemeProvenance.updateMany({ where: { senseId: sense.id }, data: { lexemeId: target.id } });
      }
    }

    await tx.translation.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.lexemeProvenance.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.lexicalPattern.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.example.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.mistake.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.learningSessionItem.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });
    await tx.battleQuestion.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });

    const uniqueTables = [
      ["LexemeGrammarConcept", "grammarConceptId", "relationType"],
      ["TopicPackItem", "topicPackId", null],
      ["StoryTarget", "storyId", null],
      ["ReadingItem", "readingDocumentId", null],
      ["RecommendationFeedback", "userCourseId", null],
      ["ConversationTarget", "sessionId", null],
      ["WritingTarget", "writingSessionId", null],
      ["LexemeInsight", "level", null],
    ] as const;
    for (const [table, ownerColumn, secondColumn] of uniqueTables) {
      const extra = secondColumn
        ? Prisma.raw(` AND s."${secondColumn}" = t."${secondColumn}"`)
        : Prisma.empty;
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM ${Prisma.raw('"' + table + '"')} s
        USING ${Prisma.raw('"' + table + '"')} t
        WHERE s."lexemeId" = ${source.id}
          AND t."lexemeId" = ${target.id}
          AND s.${Prisma.raw('"' + ownerColumn + '"')} = t.${Prisma.raw('"' + ownerColumn + '"')}
          ${extra}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE ${Prisma.raw('"' + table + '"')}
        SET "lexemeId" = ${target.id}
        WHERE "lexemeId" = ${source.id}
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "Encounter" s
      USING "Encounter" t
      WHERE s."lexemeId" = ${source.id}
        AND t."lexemeId" = ${target.id}
        AND s."userCourseId" = t."userCourseId"
        AND s."source" = t."source"
        AND s."sourceRef" IS NOT DISTINCT FROM t."sourceRef"
    `);
    await tx.encounter.updateMany({ where: { lexemeId: source.id }, data: { lexemeId: target.id } });

    // Relations that would become self-relations are discarded; exact duplicate edges are de-duplicated.
    await tx.lexemeRelation.deleteMany({
      where: {
        OR: [
          { sourceId: source.id, targetId: target.id },
          { sourceId: target.id, targetId: source.id },
        ],
      },
    });
    const outgoing = await tx.lexemeRelation.findMany({ where: { sourceId: source.id } });
    for (const relation of outgoing) {
      const duplicate = await tx.lexemeRelation.findUnique({
        where: { sourceId_targetId_type: { sourceId: target.id, targetId: relation.targetId, type: relation.type } },
      });
      if (duplicate) await tx.lexemeRelation.delete({ where: { id: relation.id } });
      else await tx.lexemeRelation.update({ where: { id: relation.id }, data: { sourceId: target.id } });
    }
    const incoming = await tx.lexemeRelation.findMany({ where: { targetId: source.id } });
    for (const relation of incoming) {
      const duplicate = await tx.lexemeRelation.findUnique({
        where: { sourceId_targetId_type: { sourceId: relation.sourceId, targetId: target.id, type: relation.type } },
      });
      if (duplicate) await tx.lexemeRelation.delete({ where: { id: relation.id } });
      else await tx.lexemeRelation.update({ where: { id: relation.id }, data: { targetId: target.id } });
    }

    // Confusion pairs may collapse or collide after the merge.
    const pairs = await tx.confusionPair.findMany({
      where: { OR: [{ leftLexemeId: source.id }, { rightLexemeId: source.id }] },
    });
    for (const pair of pairs) {
      const leftLexemeId = pair.leftLexemeId === source.id ? target.id : pair.leftLexemeId;
      const rightLexemeId = pair.rightLexemeId === source.id ? target.id : pair.rightLexemeId;
      if (leftLexemeId === rightLexemeId) {
        await tx.confusionPair.delete({ where: { id: pair.id } });
        continue;
      }
      const duplicate = await tx.confusionPair.findUnique({
        where: {
          userCourseId_leftLexemeId_rightLexemeId: {
            userCourseId: pair.userCourseId,
            leftLexemeId,
            rightLexemeId,
          },
        },
      });
      if (duplicate && duplicate.id !== pair.id) {
        await tx.confusionPair.delete({ where: { id: pair.id } });
      } else {
        await tx.confusionPair.update({
          where: { id: pair.id },
          data: { leftLexemeId, rightLexemeId },
        });
      }
    }

    await tx.lexeme.delete({ where: { id: source.id } });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "lexeme.merge_completed",
        targetType: "lexeme",
        targetId: target.id,
        requestId,
        metadata: { sourceLexemeId, targetLexemeId },
      },
    });
    return target.id;
  }, { maxWait: 5_000, timeout: 30_000 });
}
