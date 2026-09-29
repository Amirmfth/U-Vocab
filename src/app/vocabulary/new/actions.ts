"use server";

import { revalidatePath } from "next/cache";
import { analyzeGermanLexeme } from "@/lib/ai/analyze-word";
import { analyzeGermanLexemeBatch } from "@/lib/ai/analyze-word-batch";
import { analyzeReadingText } from "@/lib/ai/reading-analyzer";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { buildReadingExcerpt, rankReadingCandidates } from "@/lib/ai/preprocess";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { targetLanguageConfig } from "@/lib/languages";
import { db } from "@/lib/db";
import { startOperation } from "@/lib/performance";
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
  analysis: Awaited<ReturnType<typeof analyzeGermanLexeme>>,
): IngestionCandidate {
  const normalized = analysis.lemma.toLocaleLowerCase("de-DE");
  return {
    key: normalized + ":" + analysis.partOfSpeech,
    sourceType: "PASTED_TEXT",
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
    example: analysis.examples[0]?.german ?? null,
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
    return { status: "error", message: "Paste a German word, phrase, or text to analyze." };
  }

  try {
    const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
    const language = targetLanguageConfig(course.targetLanguage);
    let candidates: IngestionCandidate[];

    if (isShortLexicalUnit(text)) {
      const analysis = await analyzeGermanLexeme(text, user.id);
      candidates = [candidateFromLexicalAnalysis(analysis)];
    } else {
      const knownVocabulary = await db.userVocabulary.findMany({
        where: { userCourseId: course.id },
        select: { lexeme: { select: { normalized: true } } },
      });
      const knownLemmas = new Set(
        knownVocabulary.map((item) => item.lexeme.normalized),
      );
      const readingCandidates = rankReadingCandidates(text, knownLemmas, 30);
      const excerpt = buildReadingExcerpt(text, readingCandidates, 12_000);
      const analysis = await analyzeReadingText({
        userId: user.id,
        userCourseId: course.id,
        text: excerpt,
        originalTextChars: text.length,
        candidates: readingCandidates,
        targetLevel: course.targetLevel,
      });

      candidates = analysis.lexicalUnits.map((item) => {
        const normalized = item.lemma.toLocaleLowerCase(language.locale);
        return {
          key: normalized + ":" + item.partOfSpeech,
          sourceType: "PASTED_TEXT",
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
    let sourceType: "PASTED_TEXT" | "CSV" = candidate?.sourceType === "CSV" ? "CSV" : "PASTED_TEXT";

    if (input.word !== undefined) {
      const word = input.word.trim();
      if (!word || word.length > 300) throw new Error("Enter one German word or phrase per item.");
      const analysis = await perf.span("ai", () => analyzeGermanLexeme(word, user.id));
      candidate = { ...candidateFromLexicalAnalysis(analysis), sourceType: "CSV" };
      sourceType = "CSV";
    }

    if (!candidate) throw new Error("No vocabulary item was provided.");
    const [lexemeId] = await perf.span("dbSave", () => commitIngestionCandidates(db, {
      userId: user.id,
      userCourseId: course.id,
      targetLanguage: course.targetLanguage,
      sourceType,
      sourceRef: `${sourceType.toLocaleLowerCase("en-US")}:${crypto.randomUUID()}`,
      candidates: [candidate],
    }));
    if (!input.deferRevalidation) {
      await perf.span("invalidate", async () => {
        revalidateUserDomains(user.id, course.id, ["home", "vocabulary", "review", "progress"], [lexemeId]);
        revalidatePath("/vocabulary");
      });
    }
    perf.success();
    return { status: "success" as const, lexemeId };
  } catch (error) {
    perf.fail(error);
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not add this word.",
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
    if (words.length < 1 || words.length > 8 || words.some((word) => !word.trim() || word.length > 300)) {
      throw new Error("Send 1–8 German words or phrases per batch.");
    }
    const [user, course] = await Promise.all([
      perf.span("auth", () => getCurrentUser()),
      perf.span("course", () => getCurrentCourse()),
    ]);
    const language = targetLanguageConfig(course.targetLanguage);
    const normalized = words.map((word) => word.trim().toLocaleLowerCase(language.locale));
    const existing = await perf.span("existingLookup", () => db.lexeme.findMany({
      where: { language: language.code, normalized: { in: normalized } },
      include: { translations: true, patterns: { take: 1 }, examples: { take: 1 } },
    }));
    const byNormalized = new Map<string, typeof existing>();
    for (const lexeme of existing) {
      const group = byNormalized.get(lexeme.normalized) ?? [];
      group.push(lexeme);
      byNormalized.set(lexeme.normalized, group);
    }

    const results: Array<{ index: number; candidate: IngestionCandidate }> = [];
    const missing: Array<{ index: number; word: string }> = [];
    words.forEach((word, index) => {
      const matches = byNormalized.get(normalized[index]) ?? [];
      const match = matches.length === 1 ? matches[0] : null;
      const english = match?.translations.find((translation) => translation.language === "en")?.text;
      const persian = match?.translations.find((translation) => translation.language === "fa")?.text;
      if (match && english && persian) {
        results.push({ index, candidate: {
          key: `${match.normalized}:${match.partOfSpeech}`,
          sourceType: "CSV",
          lemma: match.lemma,
          normalized: match.normalized,
          partOfSpeech: match.partOfSpeech,
          article: match.article,
          plural: match.plural,
          cefrLevel: match.cefrLevel && ["A1", "A2", "B1", "B2", "C1", "C2"].includes(match.cefrLevel)
            ? match.cefrLevel as IngestionCandidate["cefrLevel"]
            : null,
          englishMeaning: english,
          persianMeaning: persian,
          pattern: match.patterns[0]?.pattern ?? null,
          patternExplanation: match.patterns[0]?.explanation ?? null,
          example: match.examples[0]?.german ?? null,
        } });
      } else {
        missing.push({ index, word });
      }
    });

    if (missing.length) {
      async function analyzeChunk(chunk: typeof missing): Promise<void> {
        try {
          const analyzed = await analyzeGermanLexemeBatch(chunk.map((item) => item.word), user.id);
          for (const item of analyzed) {
            results.push({ index: chunk[item.index].index, candidate: { ...candidateFromLexicalAnalysis(item.analysis), sourceType: "CSV" } });
          }
        } catch {
          if (chunk.length === 1) return;
          const middle = Math.ceil(chunk.length / 2);
          await Promise.all([analyzeChunk(chunk.slice(0, middle)), analyzeChunk(chunk.slice(middle))]);
        }
      }
      await perf.span("ai", () => analyzeChunk(missing));
    }
    perf.success({ existingCount: words.length - missing.length, analyzedCount: results.length - (words.length - missing.length) });
    return { status: "success" as const, results };
  } catch (error) {
    perf.fail(error);
    return { status: "error" as const, message: error instanceof Error ? error.message : "Could not analyze this batch." };
  }
}
