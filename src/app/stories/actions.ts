"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateStory } from "@/lib/ai/story";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\export type StoryState = {");
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
  const length = String(formData.get("length") ?? "MEDIUM") as "SHORT" | "MEDIUM" | "LONG";
  const topic = String(formData.get("topic") ?? "").trim() || null;
  const selectedIds = formData.getAll("targetIds").map(String);

  if (!["A1","A2","B1","B2","C1","C2"].includes(level)) {
    return { status: "error", message: "Choose a valid CEFR level." };
  }
  if (!["SHORT","MEDIUM","LONG"].includes(length)) {
    return { status: "error", message: "Choose a valid story length." };
  }

  try {
    const user = await getCurrentUser();

    const targets = selectedIds.length
      ? await db.userVocabulary.findMany({
          where: { userId: user.id, lexemeId: { in: selectedIds } },
          select: {
            lexemeId: true,
            lexeme: {
              select: {
                lemma: true,
                patterns: { select: { pattern: true } },
              },
            },
          },
          take: 10,
        })
      : await db.userVocabulary.findMany({
          where: {
            userId: user.id,
            state: { in: ["NEW","LEARNING","FAMILIAR","ACTIVE"] },
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
          take: 6,
        });

    if (!targets.length) {
      return {
        status: "error",
        message: "Add or select vocabulary before generating a story.",
      };
    }

    const generated = await generateStory({
      userId: user.id,
      level,
      length,
      topic,
      targets: targets.map((item) => ({
        lemma: item.lexeme.lemma,
        pattern: item.lexeme.patterns[0]?.pattern ?? null,
      })),
    });

    const normalizedUsed = new Set(
      generated.usedTargets.map((lemma) => lemma.toLocaleLowerCase("de-DE").trim()),
    );

    const usedTargets = targets.filter((item) => {
      const normalizedLemma = item.lexeme.lemma.toLocaleLowerCase("de-DE").trim();
      return normalizedUsed.has(normalizedLemma) &&
        storyContainsLemma(generated.content, item.lexeme.lemma);
    });

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
      message: error instanceof Error ? error.message : "Could not generate this story.",
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
      message: error instanceof Error ? error.message : "Could not record this reading.",
    };
  }
}
