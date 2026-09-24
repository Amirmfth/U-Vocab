"use server";

import type { PartOfSpeech } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateTopicPack } from "@/lib/ai/topic-pack";
import { revalidateUserDomains } from "@/lib/cache-tags";

export type TopicPackState = {
  status: "idle" | "success" | "error";
  message?: string;
  packId?: string;
};

export async function createTopicPack(
  _previous: TopicPackState,
  formData: FormData,
): Promise<TopicPackState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const size = Number(formData.get("size") ?? 12);

  if (!topic) return { status: "error", message: "Enter a topic." };
  if (!["A1","A2","B1","B2","C1","C2"].includes(level)) {
    return { status: "error", message: "Choose a valid CEFR level." };
  }
  if (!Number.isFinite(size) || size < 4 || size > 30) {
    return { status: "error", message: "Pack size must be between 4 and 30." };
  }

  try {
    const user = await getCurrentUser();
    const result = await generateTopicPack({
      userId: user.id,
      topic,
      level,
      size,
    });

    const pack = await db.$transaction(
      async (tx) => {
        const created = await tx.topicPack.create({
          data: {
            userId: user.id,
            title: result.title,
            topic,
            level,
            description: result.description,
          },
        });

        const seen = new Set<string>();
        let position = 0;

        for (const item of result.items) {
          const normalized = item.lemma.toLocaleLowerCase("de-DE").trim();
          const key = normalized + ":" + item.partOfSpeech;
          if (seen.has(key)) continue;
          seen.add(key);

          const lexeme = await tx.lexeme.upsert({
            where: {
              language_normalized_partOfSpeech: {
                language: "de",
                normalized,
                partOfSpeech: item.partOfSpeech as PartOfSpeech,
              },
            },
            create: {
              lemma: item.lemma,
              normalized,
              partOfSpeech: item.partOfSpeech as PartOfSpeech,
              article: item.article,
              plural: item.plural,
              translations: {
                create: [
                  { language: "en", text: item.englishMeaning },
                  { language: "fa", text: item.persianMeaning },
                ],
              },
            },
            update: {},
          });

          await tx.topicPackItem.create({
            data: {
              topicPackId: created.id,
              lexemeId: lexeme.id,
              rationale: item.rationale,
              usefulness: item.usefulness,
              position: position++,
            },
          });
        }

        return created;
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    revalidateUserDomains(user.id, ["topicPacks", "vocabulary"]);
    revalidatePath("/topic-packs");

    return {
      status: "success",
      message: "Topic pack generated and saved.",
      packId: pack.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not generate this topic pack.",
    };
  }
}

export type PackMutationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function removePackItem(
  _previous: PackMutationState,
  formData: FormData,
): Promise<PackMutationState> {
  const itemId = String(formData.get("itemId") ?? "");

  try {
    const user = await getCurrentUser();
    const item = await db.topicPackItem.findFirst({
      where: { id: itemId, topicPack: { userId: user.id } },
      select: { id: true, topicPackId: true },
    });

    if (!item) return { status: "error", message: "Pack item not found." };

    await db.topicPackItem.delete({ where: { id: item.id } });
    revalidateUserDomains(user.id, ["topicPacks", "vocabulary"]);
    revalidatePath("/topic-packs/" + item.topicPackId);

    return { status: "success", message: "Removed from this pack." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not remove this item.",
    };
  }
}

export async function addPackToVocabulary(
  _previous: PackMutationState,
  formData: FormData,
): Promise<PackMutationState> {
  const packId = String(formData.get("packId") ?? "");

  try {
    const user = await getCurrentUser();
    const pack = await db.topicPack.findFirst({
      where: { id: packId, userId: user.id },
      include: { items: true },
    });

    if (!pack) return { status: "error", message: "Topic pack not found." };

    await db.$transaction(
      pack.items.map((item) =>
        db.userVocabulary.upsert({
          where: {
            userId_lexemeId: {
              userId: user.id,
              lexemeId: item.lexemeId,
            },
          },
          create: {
            userId: user.id,
            lexemeId: item.lexemeId,
            nextReviewAt: new Date(),
          },
          update: {},
        }),
      ),
    );

    revalidateUserDomains(
      user.id,
      ["home", "vocabulary", "review", "topicPacks"],
      pack.items.map((item) => item.lexemeId),
    );
    revalidatePath("/topic-packs/" + pack.id);
    revalidatePath("/vocabulary");

    return {
      status: "success",
      message: "Pack vocabulary added to your personal library.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add this pack.",
    };
  }
}

export async function launchPackSession(formData: FormData) {
  const packId = String(formData.get("packId") ?? "");
  const user = await getCurrentUser();

  const pack = await db.topicPack.findFirst({
    where: { id: packId, userId: user.id },
    include: { items: true },
  });

  if (!pack) throw new Error("Topic pack not found.");

  await db.$transaction(
    pack.items.map((item) =>
      db.userVocabulary.upsert({
        where: {
          userId_lexemeId: {
            userId: user.id,
            lexemeId: item.lexemeId,
          },
        },
        create: {
          userId: user.id,
          lexemeId: item.lexemeId,
          nextReviewAt: new Date(),
        },
        update: {},
      }),
    ),
  );

  revalidateUserDomains(
    user.id,
    ["home", "vocabulary", "review", "topicPacks"],
    pack.items.map((item) => item.lexemeId),
  );

  redirect("/topic-packs/" + pack.id + "/learn");
}
