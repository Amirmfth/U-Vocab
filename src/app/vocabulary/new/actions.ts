"use server";

import { revalidatePath } from "next/cache";
import { analyzeLexeme } from "@/lib/ai/analyze-word";
import { analyzeLexemeBatch } from "@/lib/ai/analyze-word-batch";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { buildReadingExcerpt, rankReadingCandidates } from "@/lib/ai/preprocess";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { resolveExistingLexeme } from "@/lib/lexicon/resolver";
import { lexiconAdapter } from "@/lib/lexicon/normalization";
import { targetLanguageConfig } from "@/lib/languages";
import { AI_PROVIDER } from "@/lib/ai/client";
import { aiRoute } from "@/lib/ai/routing";
import { promptVersionFor } from "@/lib/ai/prompt-versions";
import { checkQuota, consumeQuota } from "@/lib/entitlements/service";
import { assertProviderSpendSafety } from "@/lib/entitlements/spend-safety";
import { QuotaExceededError } from "@/lib/entitlements/errors";
import { entitlementErrorMessage } from "@/lib/entitlements/errors";
import { db } from "@/lib/db";
import { startOperation } from "@/lib/performance";
import { recordProductEvent } from "@/lib/product-events";
import {
  attachIngestionState,
  commitIngestionCandidates,
  deduplicateCandidates,
} from "@/lib/ingestion/service";
import type {
  CandidateWithState,
  IngestionCandidate,
} from "@/lib/ingestion/types";

export type VocabularyPreviewState = {
  status: "idle" | "success" | "error";
  message?: string;
  candidates?: CandidateWithState[];
};

function candidateFromLexicalAnalysis(
  analysis: Awaited<ReturnType<typeof analyzeLexeme>>,
  input: {
    rawSurface: string;
    sourceType: IngestionCandidate["sourceType"];
    targetLanguage: Parameters<typeof lexiconAdapter>[0];
    operation: "lexical_analysis" | "lexical_batch_analysis";
  },
): IngestionCandidate {
  const normalized = lexiconAdapter(input.targetLanguage).normalizeCanonical(
    analysis.lemma,
    analysis.partOfSpeech,
  );
  const route = aiRoute(input.operation);
  return {
    key: normalized + ":" + analysis.partOfSpeech,
    sourceType: input.sourceType,
    surface: input.rawSurface,
    lemma: analysis.lemma,
    normalized,
    partOfSpeech: analysis.partOfSpeech,
    article: analysis.article,
    plural: analysis.plural,
    cefrLevel: analysis.cefrLevel,
    englishMeaning: analysis.englishMeanings.join("; "),
    persianMeaning: analysis.persianMeanings.join("؛ "),
    pattern: analysis.patterns[0]?.pattern ?? null,
    patternExplanation: analysis.patterns[0]?.explanation ?? null,
    example: analysis.examples[0]?.targetText ?? null,
    resolutionSource: "ai_generation",
    provenance: {
      source: "AI_GENERATED",
      provider: AI_PROVIDER,
      model: route.model,
      promptVersion: promptVersionFor(input.operation),
      contentVersion: "lexical-v1",
      reviewState: "UNREVIEWED",
    },
  };
}

function isShortLexicalUnit(input: string) {
  return !/[.!?]/.test(input) && input.split(/\s+/).length <= 6;
}

export async function previewVocabularyText(
  _previous: VocabularyPreviewState,
  formData: FormData,
): Promise<VocabularyPreviewState> {
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return { status: "error", message: "Paste a word, phrase, or text in your course language to analyze." };
  }

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    let candidates: IngestionCandidate[];

    if (isShortLexicalUnit(text)) {
      const existing = await resolveExistingLexeme(db, {
        targetLanguage: course.targetLanguage,
        rawInput: text,
        sourceType: "PASTED_TEXT",
      });
      if (existing.candidate) {
        candidates = [existing.candidate];
      } else {
        const quota = await checkQuota({
          userId: user.id,
          userCourseId: course.id,
          timeZone: user.timezone,
          key: "vocabulary_addition_daily",
        });
        if (!quota.allowed) {
          throw new QuotaExceededError(
            "vocabulary_addition_daily",
            quota.limit,
            quota.used,
            quota.resetAt,
          );
        }
        await assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone });
        const analysis = await analyzeLexeme({
          text,
          userId: user.id,
          userCourseId: course.id,
          targetLanguage: course.targetLanguage,
        });
        candidates = [candidateFromLexicalAnalysis(analysis, {
          rawSurface: text,
          sourceType: "PASTED_TEXT",
          targetLanguage: course.targetLanguage,
          operation: "lexical_analysis",
        })];
      }
    } else {
      const knownVocabulary = await db.userVocabulary.findMany({
        where: { userCourseId: course.id },
        select: { lexeme: { select: { normalized: true } } },
      });
      const knownLemmas = new Set(
        knownVocabulary.map((item) => item.lexeme.normalized),
      );
      const readingCandidates = rankReadingCandidates(text, knownLemmas, 30, course.targetLanguage);
      const excerpt = buildReadingExcerpt(text, readingCandidates, 12_000, course.targetLanguage);
      const quota = await checkQuota({
        userId: user.id,
        userCourseId: course.id,
        timeZone: user.timezone,
        key: "vocabulary_addition_daily",
      });
      if (!quota.allowed) {
        throw new QuotaExceededError(
          "vocabulary_addition_daily",
          quota.limit,
          quota.used,
          quota.resetAt,
        );
      }
      await assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone });
      const analysis = await analyzeReadingText({
        userId: user.id,
        userCourseId: course.id,
        text: excerpt,
        originalTextChars: text.length,
        candidates: readingCandidates,
        targetLevel: course.targetLevel,
        targetLanguage: course.targetLanguage,
      });

      candidates = analysis.lexicalUnits.map((item) => {
        const normalized = lexiconAdapter(course.targetLanguage).normalizeCanonical(
          item.lemma,
          item.partOfSpeech,
        );
        return {
          key: normalized + ":" + item.partOfSpeech,
          sourceType: "PASTED_TEXT",
          surface: item.lemma,
          lemma: item.lemma,
          normalized,
          partOfSpeech: item.partOfSpeech,
          article: item.article,
          plural: item.plural,
          cefrLevel: item.cefrLevel,
          englishMeaning: item.englishMeaning,
          persianMeaning: item.persianMeaning,
          pattern: item.pattern,
          patternExplanation: item.patternExplanation,
          example: item.example,
          resolutionSource: "ai_generation",
          provenance: {
            source: "AI_GENERATED",
            provider: AI_PROVIDER,
            model: aiRoute("reading_analysis").model,
            promptVersion: promptVersionFor("reading_analysis"),
            contentVersion: "reading-lexical-v1",
            reviewState: "UNREVIEWED",
          },
        };
      });
    }

    const withState = await attachIngestionState(
      db,
      user.id,
      course.id,
      course.targetLanguage,
      deduplicateCandidates(candidates),
    );

    return {
      status: "success",
      message: `Found ${withState.length} lexical unit${withState.length === 1 ? "" : "s"}.`,
      candidates: withState,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not analyze this text.",
    };
  }
}

export async function addVocabularyItem(input: {
  candidate?: IngestionCandidate;
  word?: string;
  deferRevalidation?: boolean;
}) {
  const perf = startOperation("vocabulary.add_item", { mode: input.word === undefined ? "preview" : "single_word" });
  try {
    const [user, course] = await Promise.all([
      perf.span("auth", () => getCurrentUser()),
      perf.span("course", () => getCurrentCourse()),
    ]);
    let candidate = input.candidate;
    let resolutionSource = candidate?.resolutionSource ?? "preview_candidate";
    await recordProductEvent("vocabulary_add_started", {
      source: input.word !== undefined ? "manual" : candidate?.sourceType === "CSV" ? "csv" : "paste",
      itemCount: 1,
    });
    let sourceType: "PASTED_TEXT" | "CSV" = candidate?.sourceType === "CSV" ? "CSV" : "PASTED_TEXT";

    if (input.word !== undefined) {
      const word = input.word.trim();
      if (!word || word.length > 300) throw new Error("Enter one word or phrase per item.");
      const existing = await perf.span("lexiconLookup", () => resolveExistingLexeme(db, {
        targetLanguage: course.targetLanguage,
        rawInput: word,
        sourceType: "CSV",
      }));
      if (existing.candidate) {
        candidate = existing.candidate;
        resolutionSource = existing.source;
      } else {
        resolutionSource = existing.source === "ambiguous" ? "ambiguous" : "ai_generation";
        const quota = await perf.span("quotaCheck", () =>
          checkQuota({
            userId: user.id,
            userCourseId: course.id,
            timeZone: user.timezone,
            key: "vocabulary_addition_daily",
          }),
        );
        if (!quota.allowed) {
          throw new QuotaExceededError(
            "vocabulary_addition_daily",
            quota.limit,
            quota.used,
            quota.resetAt,
          );
        }
        await perf.span("spendSafety", () =>
          assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone }),
        );
        const analysis = await perf.span("ai", () =>
          analyzeLexeme({
            text: word,
            userId: user.id,
            userCourseId: course.id,
            targetLanguage: course.targetLanguage,
          }),
        );
        candidate = candidateFromLexicalAnalysis(analysis, {
          rawSurface: word,
          sourceType: "CSV",
          targetLanguage: course.targetLanguage,
          operation: "lexical_analysis",
        });
      }
      sourceType = "CSV";
    }

    if (!candidate) throw new Error("No vocabulary item was provided.");

    const ownershipResolution = await perf.span("quotaLookup", () =>
      resolveExistingLexeme(db, {
        targetLanguage: course.targetLanguage,
        rawInput: candidate!.lemma,
        partOfSpeech: candidate!.partOfSpeech,
        sourceType,
      }),
    );
    const owned = ownershipResolution.lexeme
      ? await db.userVocabulary.findUnique({
          where: {
            userCourseId_lexemeId: {
              userCourseId: course.id,
              lexemeId: ownershipResolution.lexeme.id,
            },
          },
          select: { id: true },
        })
      : null;

    if (!owned) {
      const quotaIdentity =
        ownershipResolution.lexeme?.id ??
        [course.targetLanguage, candidate.normalized, candidate.partOfSpeech].join(":");
      await perf.span("quota", () =>
        consumeQuota({
          userId: user.id,
          userCourseId: course.id,
          timeZone: user.timezone,
          key: "vocabulary_addition_daily",
          sourceRef: "vocabulary:" + course.id + ":" + quotaIdentity,
          metadata: { resolutionSource: candidate.resolutionSource ?? null },
        }),
      );
    }

    const [lexemeId] = await perf.span("dbSave", () => commitIngestionCandidates(db, {
      userId: user.id,
      userCourseId: course.id,
      targetLanguage: course.targetLanguage,
      sourceType,
      sourceRef: `${sourceType.toLocaleLowerCase("en-US")}:${crypto.randomUUID()}`,
      candidates: [candidate],
    }));
    await recordProductEvent("vocabulary_added", {
      source: sourceType === "CSV" ? "csv" : "paste",
      resolution:
        resolutionSource === "canonical_hit" ||
        resolutionSource === "alias_hit" ||
        resolutionSource === "ai_generation" ||
        resolutionSource === "ambiguous"
          ? resolutionSource
          : "unknown",
      partOfSpeech: candidate.partOfSpeech,
      cefrLevel: candidate.cefrLevel ?? null,
    });
    if (ownershipResolution.source === "canonical_hit" || ownershipResolution.source === "alias_hit") {
      await recordProductEvent("vocabulary_duplicate_resolved", {
        resolution: ownershipResolution.source,
        alreadyOwned: Boolean(owned),
      });
    }

    if (!input.deferRevalidation) {
      await perf.span("invalidate", async () => {
        revalidateUserDomains(user.id, course.id, ["home", "vocabulary", "review", "progress"], [lexemeId]);
        revalidatePath("/vocabulary");
      });
    }
    perf.success({ resolutionSource });
    return { status: "success" as const, lexemeId };
  } catch (error) {
    perf.fail(error);
    return {
      status: "error" as const,
      message:
        entitlementErrorMessage(error) ??
        (error instanceof Error ? error.message : "Could not add this word."),
    };
  }
}

export async function finishVocabularyImport(lexemeIds: string[]) {
  if (!lexemeIds.length) return;
  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  revalidateUserDomains(user.id, course.id, ["home", "vocabulary", "review", "progress"], lexemeIds);
  revalidatePath("/vocabulary");
}

export async function analyzeVocabularyBatch(words: string[]) {
  const perf = startOperation("vocabulary.analyze_batch", { wordCount: words.length });
  try {
    if (
      words.length < 1 ||
      words.length > 8 ||
      words.some((word) => !word.trim() || word.length > 300)
    ) {
      throw new Error("Send 1–8 words or phrases per batch.");
    }

    const [user, course] = await Promise.all([
      perf.span("auth", () => getCurrentUser()),
      perf.span("course", () => getCurrentCourse()),
    ]);

    const results: Array<{ index: number; candidate: IngestionCandidate }> = [];
    const missing: Array<{ index: number; word: string; resolutionSource: "miss" | "ambiguous" }> = [];

    await perf.span("lexiconLookup", async () => {
      await Promise.all(
        words.map(async (word, index) => {
          const resolution = await resolveExistingLexeme(db, {
            targetLanguage: course.targetLanguage,
            rawInput: word,
            sourceType: "CSV",
          });
          if (resolution.candidate) {
            results.push({ index, candidate: resolution.candidate });
          } else {
            missing.push({
              index,
              word,
              resolutionSource: resolution.source,
            });
          }
        }),
      );
    });

    if (missing.length) {
      const quota = await perf.span("quotaCheck", () =>
        checkQuota({
          userId: user.id,
          userCourseId: course.id,
          timeZone: user.timezone,
          key: "vocabulary_addition_daily",
          amount: missing.length,
        }),
      );
      if (!quota.allowed) {
        throw new QuotaExceededError(
          "vocabulary_addition_daily",
          quota.limit,
          quota.used,
          quota.resetAt,
        );
      }
      await perf.span("spendSafety", () =>
        assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone }),
      );
      async function analyzeChunk(chunk: typeof missing): Promise<void> {
        try {
          const analyzed = await analyzeLexemeBatch({
            words: chunk.map((item) => item.word),
            userId: user.id,
            userCourseId: course.id,
            targetLanguage: course.targetLanguage,
          });
          for (const item of analyzed) {
            const source = chunk[item.index];
            results.push({
              index: source.index,
              candidate: candidateFromLexicalAnalysis(item.analysis, {
                rawSurface: source.word,
                sourceType: "CSV",
                targetLanguage: course.targetLanguage,
                operation: "lexical_batch_analysis",
              }),
            });
          }
        } catch {
          if (chunk.length === 1) return;
          const middle = Math.ceil(chunk.length / 2);
          await Promise.all([
            analyzeChunk(chunk.slice(0, middle)),
            analyzeChunk(chunk.slice(middle)),
          ]);
        }
      }
      await perf.span("ai", () => analyzeChunk(missing));
    }

    results.sort((a, b) => a.index - b.index);
    perf.success({
      canonicalOrAliasHits: words.length - missing.length,
      aiAnalyzed: results.length - (words.length - missing.length),
      ambiguousBeforeAi: missing.filter((item) => item.resolutionSource === "ambiguous").length,
    });
    return { status: "success" as const, results };
  } catch (error) {
    perf.fail(error);
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not analyze this batch.",
    };
  }
}
