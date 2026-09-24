"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { rebuildMistakeEmbeddings } from "@/lib/semantic/embeddings";
import { revalidateUserDomains } from "@/lib/cache-tags";

export type MistakeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function resolveMistake(
  _previous: MistakeActionState,
  formData: FormData,
): Promise<MistakeActionState> {
  const mistakeId = String(formData.get("mistakeId") ?? "");

  try {
    const user = await getCurrentUser();
    const mistake = await db.mistake.findFirst({
      where: { id: mistakeId, userId: user.id, resolvedAt: null },
      select: { lexemeId: true },
    });
    if (!mistake) {
      return { status: "error", message: "Mistake not found." };
    }

    const updated = await db.mistake.updateMany({
      where: {
        id: mistakeId,
        userId: user.id,
        resolvedAt: null,
      },
      data: { resolvedAt: new Date() },
    });

    if (!updated.count) {
      return { status: "error", message: "Mistake not found." };
    }

    revalidateUserDomains(
      user.id,
      ["home", "mistakes", "progress", "review"],
      [mistake.lexemeId],
    );
    revalidatePath("/mistakes");
    return { status: "success", message: "Marked resolved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not resolve this mistake.",
    };
  }
}


export async function refreshMistakeEmbeddings(
  _previous: MistakeActionState,
): Promise<MistakeActionState> {
  try {
    const user = await getCurrentUser();
    const result = await rebuildMistakeEmbeddings({ userId: user.id, limit: 30 });
    revalidateUserDomains(user.id, ["mistakes"]);
    revalidatePath("/mistakes");
    return {
      status: result.failed ? "error" : "success",
      message: result.failed
        ? "Indexed " + result.completed + " mistake patterns; " + result.failed + " failed."
        : result.completed
          ? "Indexed " + result.completed + " mistake patterns."
          : "Mistake embeddings are already current.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not refresh mistake embeddings.",
    };
  }
}
