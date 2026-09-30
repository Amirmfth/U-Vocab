import type {
  LexemeAliasKind,
  LexemeDataSource,
  LexemeReviewState,
  PartOfSpeech,
  PrismaClient,
  TargetLanguage,
} from "@prisma/client";
import { syncDeterministicGrammarLinksForLexeme } from "@/lib/grammar/lexeme-links";
import { targetLanguageConfig } from "@/lib/languages";
import { lexiconAdapter } from "@/lib/lexicon/normalization";
import { resolveExistingLexeme } from "@/lib/lexicon/resolver";
import type {
  CandidateWithState,
  IngestionCandidate,
  IngestionSourceType,
} from "./types";

export function deduplicateCandidates(
  candidates: IngestionCandidate[],
): IngestionCandidate[] {
  return Array.from(
    new Map(candidates.map((candidate) => [candidate.key, candidate])).values(),
  );
}

function aliasKindFor(
  candidate: IngestionCandidate,
  normalizedSurface: string,
  canonicalNormalized: string,
): LexemeAliasKind {
  if (
    candidate.partOfSpeech === "NOUN" &&
    /^(der|die|das)\s+/u.test(normalizedSurface)
  ) {
    return "ARTICLE_VARIANT";
  }
  if (normalizedSurface !== canonicalNormalized) return "USER_INPUT";
  return candidate.provenance?.source === "AI_GENERATED" ? "GENERATED" : "IMPORTED";
}

async function ensureAlias(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  input: {
    lexemeId: string;
    language: string;
    surface: string;
    normalizedSurface: string;
    kind: LexemeAliasKind;
    source: LexemeDataSource;
  },
) {
  if (!input.normalizedSurface) return;
  await tx.lexemeAlias.upsert({
    where: {
      language_normalizedSurface_lexemeId: {
        language: input.language,
        normalizedSurface: input.normalizedSurface,
        lexemeId: input.lexemeId,
      },
    },
    create: input,
    update: {},
  });
}

export async function attachIngestionState(
  db: PrismaClient,
  userId: string,
  userCourseId: string,
  targetLanguage: TargetLanguage,
  candidates: IngestionCandidate[],
): Promise<CandidateWithState[]> {
  const unique = deduplicateCandidates(candidates);

  return Promise.all(
    unique.map(async (candidate) => {
      const resolution = await resolveExistingLexeme(db, {
        targetLanguage,
        rawInput: candidate.surface ?? candidate.lemma,
        partOfSpeech: candidate.partOfSpeech,
        sourceType: candidate.sourceType,
      });
      const existing = resolution.lexeme
        ? await db.lexeme.findUnique({
            where: { id: resolution.lexeme.id },
            include: {
              userStates: {
                where: { userCourseId },
                select: { id: true, state: true },
                take: 1,
              },
            },
          })
        : null;

      return {
        ...candidate,
        normalized:
          resolution.lexeme?.normalized ??
          lexiconAdapter(targetLanguage).normalizeCanonical(
            candidate.lemma,
            candidate.partOfSpeech,
          ),
        resolutionSource:
          resolution.source === "miss" ? candidate.resolutionSource : resolution.source,
        existingLexemeId: existing?.id ?? null,
        userVocabularyId: existing?.userStates[0]?.id ?? null,
        state: existing?.userStates[0]?.state ?? null,
      };
    }),
  );
}

export async function commitIngestionCandidates(
  db: PrismaClient,
  input: {
    userId: string;
    userCourseId: string;
    targetLanguage: TargetLanguage;
    sourceType: IngestionSourceType;
    sourceRef?: string | null;
    candidates: IngestionCandidate[];
  },
) {
  const unique = deduplicateCandidates(input.candidates);
  const adapter = lexiconAdapter(input.targetLanguage);
  const language = targetLanguageConfig(input.targetLanguage).code;
  const timeout = Math.min(120_000, Math.max(20_000, unique.length * 1_500));

  const ids = await db.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const candidate of unique) {
      const canonicalNormalized = adapter.normalizeCanonical(
        candidate.lemma,
        candidate.partOfSpeech,
      );
      const surface = candidate.surface ?? candidate.lemma;
      const normalizedInput = adapter.normalizeInput(surface);

      const existingResolution = await resolveExistingLexeme(tx, {
        targetLanguage: input.targetLanguage,
        rawInput: surface,
        partOfSpeech: candidate.partOfSpeech,
        sourceType: input.sourceType,
      });

      let lexeme =
        existingResolution.source === "canonical_hit" ||
        existingResolution.source === "alias_hit"
          ? existingResolution.lexeme
          : null;

      if (!lexeme) {
        lexeme = await tx.lexeme.upsert({
          where: {
            language_normalized_partOfSpeech: {
              language,
              normalized: canonicalNormalized,
              partOfSpeech: candidate.partOfSpeech as PartOfSpeech,
            },
          },
          create: {
            language,
            lemma: candidate.lemma.trim(),
            normalized: canonicalNormalized,
            partOfSpeech: candidate.partOfSpeech,
            article: candidate.article ?? null,
            plural: candidate.plural ?? null,
            cefrLevel: candidate.cefrLevel ?? null,
          },
          update: {},
          include: {
            translations: true,
            patterns: { take: 1 },
            examples: { take: 1 },
          },
        });
      }

      const current = await tx.lexeme.findUniqueOrThrow({ where: { id: lexeme.id } });
      const safeFill: {
        article?: string;
        plural?: string;
        cefrLevel?: string;
      } = {};
      if (!current.article && candidate.article) safeFill.article = candidate.article;
      if (!current.plural && candidate.plural) safeFill.plural = candidate.plural;
      if (!current.cefrLevel && candidate.cefrLevel) safeFill.cefrLevel = candidate.cefrLevel;
      if (Object.keys(safeFill).length) {
        await tx.lexeme.update({
          where: { id: lexeme.id },
          data: { ...safeFill, canonicalUpdatedAt: new Date() },
        });
      }

      const provenanceSource =
        (candidate.provenance?.source ?? "IMPORTED") as LexemeDataSource;
      const reviewState =
        (candidate.provenance?.reviewState ??
          (provenanceSource === "AI_GENERATED" ? "UNREVIEWED" : "ACCEPTED")) as LexemeReviewState;

      const sense = await tx.lexemeSense.upsert({
        where: { lexemeId_key: { lexemeId: lexeme.id, key: "default" } },
        create: {
          lexemeId: lexeme.id,
          key: "default",
          source: provenanceSource,
          reviewState,
          confidence: candidate.provenance?.confidence ?? null,
        },
        update: {},
      });

      for (const translation of [
        candidate.englishMeaning
          ? { language: "en", text: candidate.englishMeaning }
          : null,
        candidate.persianMeaning
          ? { language: "fa", text: candidate.persianMeaning }
          : null,
      ].filter((item): item is { language: string; text: string } => Boolean(item))) {
        const existingTranslation = await tx.translation.findFirst({
          where: { lexemeId: lexeme.id, language: translation.language },
          select: { id: true, senseId: true },
        });
        if (!existingTranslation) {
          await tx.translation.create({
            data: {
              lexemeId: lexeme.id,
              senseId: sense.id,
              language: translation.language,
              text: translation.text,
            },
          });
        } else if (!existingTranslation.senseId) {
          await tx.translation.update({
            where: { id: existingTranslation.id },
            data: { senseId: sense.id },
          });
        }
      }

      if (candidate.pattern) {
        const existingPattern = await tx.lexicalPattern.findFirst({
          where: { lexemeId: lexeme.id, pattern: candidate.pattern },
          select: { id: true },
        });
        if (!existingPattern) {
          await tx.lexicalPattern.create({
            data: {
              lexemeId: lexeme.id,
              pattern: candidate.pattern,
              explanation: candidate.patternExplanation ?? null,
            },
          });
        }
      }

      if (candidate.example) {
        const existingExample = await tx.example.findFirst({
          where: { lexemeId: lexeme.id, german: candidate.example },
          select: { id: true },
        });
        if (!existingExample) {
          await tx.example.create({
            data: {
              lexemeId: lexeme.id,
              german: candidate.example,
              generatedByAi: provenanceSource === "AI_GENERATED",
            },
          });
        }
      }

      const aliasSource =
        provenanceSource === "AI_GENERATED" ? "AI_GENERATED" : "USER_CONFIRMED";
      await ensureAlias(tx, {
        lexemeId: lexeme.id,
        language,
        surface: normalizedInput.surface,
        normalizedSurface: normalizedInput.normalizedLookup,
        kind: aliasKindFor(
          candidate,
          normalizedInput.normalizedLookup,
          canonicalNormalized,
        ),
        source: aliasSource,
      });

      const canonicalSurface = adapter.normalizeInput(candidate.lemma);
      await ensureAlias(tx, {
        lexemeId: lexeme.id,
        language,
        surface: candidate.lemma.trim(),
        normalizedSurface: canonicalSurface.normalizedLookup,
        kind: canonicalSurface.normalizedLookup === canonicalNormalized ? "GENERATED" : "USER_INPUT",
        source: provenanceSource,
      });

      if (candidate.article && candidate.partOfSpeech === "NOUN") {
        const articleSurface = candidate.article.trim() + " " + candidate.lemma.trim();
        const articleNormalized = adapter.normalizeInput(articleSurface);
        await ensureAlias(tx, {
          lexemeId: lexeme.id,
          language,
          surface: articleSurface,
          normalizedSurface: articleNormalized.normalizedLookup,
          kind: "ARTICLE_VARIANT",
          source: provenanceSource,
        });
      }

      if (candidate.provenance) {
        await tx.lexemeProvenance.create({
          data: {
            lexemeId: lexeme.id,
            senseId: sense.id,
            source: provenanceSource,
            provider: candidate.provenance.provider ?? null,
            model: candidate.provenance.model ?? null,
            promptVersion: candidate.provenance.promptVersion ?? null,
            contentVersion: candidate.provenance.contentVersion ?? null,
            confidence: candidate.provenance.confidence ?? null,
            reviewState,
          },
        });
      }

      await tx.userVocabulary.upsert({
        where: {
          userCourseId_lexemeId: {
            userCourseId: input.userCourseId,
            lexemeId: lexeme.id,
          },
        },
        create: {
          userId: input.userId,
          userCourseId: input.userCourseId,
          lexemeId: lexeme.id,
          nextReviewAt: new Date(),
        },
        update: {},
      });

      if (input.sourceRef) {
        await tx.encounter.upsert({
          where: {
            userCourseId_lexemeId_source_sourceRef: {
              userCourseId: input.userCourseId,
              lexemeId: lexeme.id,
              source: input.sourceType.toLocaleLowerCase("en-US"),
              sourceRef: input.sourceRef,
            },
          },
          create: {
            userId: input.userId,
            userCourseId: input.userCourseId,
            lexemeId: lexeme.id,
            source: input.sourceType.toLocaleLowerCase("en-US"),
            sourceRef: input.sourceRef,
          },
          update: {},
        });
      }

      ids.push(lexeme.id);
    }

    return ids;
  }, {
    maxWait: 10_000,
    timeout,
  });

  for (const lexemeId of ids) {
    await syncDeterministicGrammarLinksForLexeme(lexemeId);
  }

  return ids;
}
