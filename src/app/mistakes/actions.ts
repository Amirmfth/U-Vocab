"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

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

    revalidatePath("/mistakes");
    return { status: "success", message: "Marked resolved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not resolve this mistake.",
    };
  }
}
