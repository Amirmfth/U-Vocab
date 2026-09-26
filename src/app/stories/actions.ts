"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateStory } from "@/lib/ai/story";

const TARGETS_PER_LENGTH = {
  SHORT: 5,
  MEDIUM: 10,
  LONG: 15,
} as const;
const STORY_CANDIDATE_POOL_SIZE = 100;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

function storyContainsLemma(content: string, lemma: string) {
  const pattern = new RegExp(
    "(?<![\\p{L}\\p{N}_])" + escapeRegex(lemma) + "(?![\\p{L}\\p{N}_])",
    "iu",
  );
  return pattern.test(content);
}

export type StoryState = {
  status: "idle" | "success" | "error";
  message?: string;
  storyId?: string;
};

export async function createStory(
  _previous: StoryState,
  formData: FormData,
): Promise<StoryState> {
  const level = String(formData.get("level") ?? "");
  const length = String(formData.get("length") ?? "MEDIUM") as
    | "SHORT"
    | "MEDIUM"
    | "LONG";
  const topic = String(formData.get("topic") ?? "").trim() || null;
  const selectedIds = formData.getAll("targetIds").map(String);

  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) {
    return { status: "error", message: "Choose a valid CEFR level." };
  }
  if (!["SHORT", "MEDIUM", "LONG"].includes(length)) {
    return { status: "error", message: "Choose a valid story length." };
  }
  const minimumTargetCount = TARGETS_PER_LENGTH[length];

  try {
    const user = await getCurrentUser();

    const selectedRows = selectedIds.length
      ? await db.lexeme.findMany({
          where: {
            id: { in: selectedIds },
            OR: [
              { userStates: { some: { userId: user.id } } },
              { topicPackItems: { some: { topicPack: { userId: user.id } } } },
            ],
          },
          select: {
            id: true,
            lemma: true,
            patterns: { select: { pattern: true } },
          },
        })
      : [];
    const selectedTargetIds = selectedRows.map((item) => item.id);
    const candidateRows = await db.userVocabulary.findMany({
      where: {
        userId: user.id,
        lexemeId: { notIn: selectedTargetIds },
      },
      select: {
        lexemeId: true,
        lexeme: {
          select: {
            lemma: true,
            patterns: { select: { pattern: true } },
          },
        },
      },
      orderBy: [
        { production: "asc" },
        { contextualUsage: "asc" },
        { meaningRecall: "asc" },
      ],
      take: STORY_CANDIDATE_POOL_SIZE,
    });

    const selectedTargets = selectedRows.map((item) => ({
      lexemeId: item.id,
      lemma: item.lemma,
      patterns: item.patterns,
    }));
    const candidateTargets = candidateRows.map((item) => ({
      lexemeId: item.lexemeId,
      lemma: item.lexeme.lemma,
      patterns: item.lexeme.patterns,
    }));
    const availableTargets = [...selectedTargets, ...candidateTargets];

    if (availableTargets.length < minimumTargetCount) {
      return {
        status: "error",
        message: `Add at least ${minimumTargetCount} vocabulary items before creating a ${length.toLowerCase()} story.`,
      };
    }

    const generated = await generateStory({
      userId: user.id,
      level,
      length,
      topic,
      minimumTargetCount,
      selectedTargets: selectedTargets.map((item) => ({
        lemma: item.lemma,
        pattern: item.patterns[0]?.pattern ?? null,
      })),
      candidateTargets: candidateTargets.map((item) => ({
        lemma: item.lemma,
        pattern: item.patterns[0]?.pattern ?? null,
      })),
    });

    const normalizedUsed = new Set(
      generated.usedTargets.map((lemma) =>
        lemma.toLocaleLowerCase("de-DE").trim(),
      ),
    );

    const usedTargets = availableTargets.filter((item) => {
      const normalizedLemma = item.lemma.toLocaleLowerCase("de-DE").trim();
      return (
        normalizedUsed.has(normalizedLemma) &&
        storyContainsLemma(generated.content, item.lemma)
      );
    });

    const allSelectedTargetsUsed = selectedTargets.every((item) =>
      usedTargets.some((used) => used.lexemeId === item.lexemeId),
    );
    if (usedTargets.length < minimumTargetCount || !allSelectedTargetsUsed) {
      return {
        status: "error",
        message: "The generated story did not include enough target words. Please try again.",
      };
    }

    const story = await db.story.create({
      data: {
        userId: user.id,
        title: generated.title,
        topic,
        level,
        length,
        content: generated.content,
        englishSummary: generated.englishSummary,
        persianSummary: generated.persianSummary,
        questions: generated.questions,
        targets: {
          create: usedTargets.map((item, index) => ({
            lexemeId: item.lexemeId,
            position: index,
          })),
        },
      },
    });

    revalidatePath("/stories");

    return {
      status: "success",
      message: "Story generated and saved.",
      storyId: story.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not generate this story.",
    };
  }
}

export type ReadState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function markStoryRead(
  _previous: ReadState,
  formData: FormData,
): Promise<ReadState> {
  const storyId = String(formData.get("storyId") ?? "");

  try {
    const user = await getCurrentUser();
    const story = await db.story.findFirst({
      where: { id: storyId, userId: user.id },
      select: {
        id: true,
        content: true,
        targets: { select: { lexemeId: true } },
      },
    });

    if (!story) return { status: "error", message: "Story not found." };

    const created = await db.encounter.createMany({
      data: story.targets.map((target) => ({
        userId: user.id,
        lexemeId: target.lexemeId,
        source: "story",
        sourceRef: story.id,
        context: story.content.slice(0, 1000),
      })),
      skipDuplicates: true,
    });

    revalidatePath("/stories/" + story.id);

    return {
      status: "success",
      message: created.count
        ? `Recorded ${created.count} vocabulary encounter${created.count === 1 ? "" : "s"}.`
        : "This story was already recorded as read.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not record this reading.",
    };
  }
}
