"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { rebuildMistakeEmbeddings } from "@/lib/semantic/embeddings";
import { revalidateUserDomains } from "@/lib/cache-tags";
import { getServerTranslator } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";

export type MistakeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function resolveMistake(
  _previous: MistakeActionState,
  formData: FormData,
): Promise<MistakeActionState> {
  const mistakeId = String(formData.get("mistakeId") ?? "");
  const user = await getCurrentUser();
  const { t } = await getServerTranslator(user);

  try {
    const course = await getCurrentCourse();
    const mistake = await db.mistake.findFirst({
      where: {
        id: mistakeId,
        userId: user.id,
        userCourseId: course.id,
        resolvedAt: null,
      },
      select: { lexemeId: true },
    });
    if (!mistake) {
      return { status: "error", message: t("mistakes.notFound") };
    }

    const updated = await db.mistake.updateMany({
      where: {
        id: mistakeId,
        userId: user.id,
        userCourseId: course.id,
        resolvedAt: null,
      },
      data: { resolvedAt: new Date() },
    });

    if (!updated.count) {
      return { status: "error", message: t("mistakes.notFound") };
    }

    revalidateUserDomains(
      user.id,
      course.id,
      ["home", "mistakes", "progress", "review"],
      mistake.lexemeId ? [mistake.lexemeId] : [],
    );
    revalidatePath("/mistakes");
    return { status: "success", message: t("mistakes.resolved") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : t("mistakes.resolveError"),
    };
  }
}

export async function refreshMistakeEmbeddings(
  _previous: MistakeActionState,
): Promise<MistakeActionState> {
  const user = await getCurrentUser();
  const { locale, t } = await getServerTranslator(user);

  try {
    const course = await getCurrentCourse();
    const result = await rebuildMistakeEmbeddings({
      userId: user.id,
      userCourseId: course.id,
      limit: 30,
    });
    revalidateUserDomains(user.id, course.id, ["mistakes"]);
    revalidatePath("/mistakes");

    return {
      status: result.failed ? "error" : "success",
      message: result.failed
        ? t("mistakes.indexedPartial", {
            completed: formatNumber(locale, result.completed),
            failed: formatNumber(locale, result.failed),
          })
        : result.completed
          ? t("mistakes.indexed", {
              completed: formatNumber(locale, result.completed),
            })
          : t("mistakes.current"),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : t("mistakes.refreshError"),
    };
  }
}
