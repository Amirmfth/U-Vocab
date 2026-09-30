import type { PartOfSpeech, Prisma, PrismaClient, TargetLanguage } from "@prisma/client";
import { lexiconAdapter } from "./normalization";
import type { IngestionCandidate, IngestionSourceType } from "@/lib/ingestion/types";

type DbLike = PrismaClient | Prisma.TransactionClient;

const LEXEME_INCLUDE = {
  translations: true,
  patterns: { take: 1 },
  examples: { take: 1 },
} satisfies Prisma.LexemeInclude;

type ResolvedLexeme = Prisma.LexemeGetPayload<{ include: typeof LEXEME_INCLUDE }>;

export type LexemeResolutionSource = "canonical_hit" | "alias_hit" | "ambiguous" | "miss";

export type ExistingLexemeResolution =
  | { source: "canonical_hit" | "alias_hit"; lexeme: ResolvedLexeme; candidate: IngestionCandidate }
  | { source: "ambiguous" | "miss"; lexeme: null; candidate: null };

export function candidateFromLexeme(lexeme: ResolvedLexeme, sourceType: IngestionSourceType): IngestionCandidate {
  const english = lexeme.translations.find((item) => item.language === "en")?.text ?? "";
  const persian = lexeme.translations.find((item) => item.language === "fa")?.text ?? "";
  return {
    key: lexeme.normalized + ":" + lexeme.partOfSpeech,
    sourceType,
    surface: lexeme.lemma,
    lemma: lexeme.lemma,
    normalized: lexeme.normalized,
    partOfSpeech: lexeme.partOfSpeech,
    article: lexeme.article,
    plural: lexeme.plural,
    cefrLevel: lexeme.cefrLevel && ["A1","A2","B1","B2","C1","C2"].includes(lexeme.cefrLevel)
      ? lexeme.cefrLevel as IngestionCandidate["cefrLevel"]
      : null,
    englishMeaning: english,
    persianMeaning: persian,
    pattern: lexeme.patterns[0]?.pattern ?? null,
    patternExplanation: lexeme.patterns[0]?.explanation ?? null,
    example: lexeme.examples[0]?.german ?? null,
    resolutionSource: "canonical_hit",
  };
}

export async function resolveExistingLexeme(
  db: DbLike,
  input: {
    targetLanguage: TargetLanguage;
    rawInput: string;
    partOfSpeech?: PartOfSpeech | null;
    sourceType: IngestionSourceType;
  },
): Promise<ExistingLexemeResolution> {
  const adapter = lexiconAdapter(input.targetLanguage);
  const normalized = adapter.normalizeInput(input.rawInput);
  if (!normalized.normalizedLookup) return { source: "miss", lexeme: null, candidate: null };

  const canonical = await db.lexeme.findMany({
    where: {
      language: adapter.languageCode,
      normalized: { in: normalized.lookupVariants },
      ...(input.partOfSpeech ? { partOfSpeech: input.partOfSpeech } : {}),
    },
    include: LEXEME_INCLUDE,
    take: 3,
  });

  if (canonical.length === 1) {
    return {
      source: "canonical_hit",
      lexeme: canonical[0],
      candidate: {
        ...candidateFromLexeme(canonical[0], input.sourceType),
        surface: normalized.surface,
        resolutionSource: "canonical_hit",
      },
    };
  }
  if (canonical.length > 1) return { source: "ambiguous", lexeme: null, candidate: null };

  const aliases = await db.lexemeAlias.findMany({
    where: {
      language: adapter.languageCode,
      normalizedSurface: { in: normalized.lookupVariants },
      ...(input.partOfSpeech ? { lexeme: { partOfSpeech: input.partOfSpeech } } : {}),
    },
    select: { lexemeId: true },
    distinct: ["lexemeId"],
    take: 3,
  });

  if (aliases.length !== 1) {
    return { source: aliases.length > 1 ? "ambiguous" : "miss", lexeme: null, candidate: null };
  }

  const lexeme = await db.lexeme.findUnique({
    where: { id: aliases[0].lexemeId },
    include: LEXEME_INCLUDE,
  });
  if (!lexeme) return { source: "miss", lexeme: null, candidate: null };

  return {
    source: "alias_hit",
    lexeme,
    candidate: {
      ...candidateFromLexeme(lexeme, input.sourceType),
      surface: normalized.surface,
      resolutionSource: "alias_hit",
    },
  };
}
