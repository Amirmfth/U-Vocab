import type { PartOfSpeech, PrismaClient } from "@prisma/client";
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

export async function attachIngestionState(
  db: PrismaClient,
  userId: string,
  candidates: IngestionCandidate[],
): Promise<CandidateWithState[]> {
  const unique = deduplicateCandidates(candidates);

  return Promise.all(
    unique.map(async (candidate) => {
      const existing = await db.lexeme.findUnique({
        where: {
          language_normalized_partOfSpeech: {
            language: "de",
            normalized: candidate.normalized,
            partOfSpeech: candidate.partOfSpeech,
          },
        },
        include: {
          userStates: {
            where: { userId },
            select: { id: true, state: true },
            take: 1,
          },
        },
      });

      return {
        ...candidate,
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
    sourceType: IngestionSourceType;
    sourceRef?: string | null;
    candidates: IngestionCandidate[];
  },
) {
  const unique = deduplicateCandidates(input.candidates);

  return db.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const candidate of unique) {
      const lexeme = await tx.lexeme.upsert({
        where: {
          language_normalized_partOfSpeech: {
            language: "de",
            normalized: candidate.normalized,
            partOfSpeech: candidate.partOfSpeech as PartOfSpeech,
          },
        },
        create: {
          lemma: candidate.lemma,
          normalized: candidate.normalized,
          partOfSpeech: candidate.partOfSpeech,
          article: candidate.article ?? null,
          plural: candidate.plural ?? null,
          translations: {
            create: [
              ...(candidate.englishMeaning
                ? [{ language: "en", text: candidate.englishMeaning }]
                : []),
              ...(candidate.persianMeaning
                ? [{ language: "fa", text: candidate.persianMeaning }]
                : []),
            ],
          },
          patterns: candidate.pattern
            ? {
                create: [{
                  pattern: candidate.pattern,
                  explanation: candidate.patternExplanation ?? null,
                }],
              }
            : undefined,
          examples: candidate.example
            ? {
                create: [{
                  german: candidate.example,
                  generatedByAi: true,
                }],
              }
            : undefined,
        },
        update: {},
      });

      await tx.userVocabulary.upsert({
        where: {
          userId_lexemeId: {
            userId: input.userId,
            lexemeId: lexeme.id,
          },
        },
        create: {
          userId: input.userId,
          lexemeId: lexeme.id,
          nextReviewAt: new Date(),
        },
        update: {},
      });

      if (input.sourceRef) {
        await tx.encounter.upsert({
          where: {
            userId_lexemeId_source_sourceRef: {
              userId: input.userId,
              lexemeId: lexeme.id,
              source: input.sourceType.toLocaleLowerCase("en-US"),
              sourceRef: input.sourceRef,
            },
          },
          create: {
            userId: input.userId,
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
  });
}
