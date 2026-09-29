import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { getVerbConjugationForUser } from "@/lib/ai/verb-conjugation";
import { isUnauthorizedError } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, user, course] = await Promise.all([params, getCurrentUser(), getCurrentCourse()]);
    const result = await getVerbConjugationForUser({
      userId: user.id,
      userCourseId: course.id,
      lexemeId: id,
    });
    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Vocabulary item not found." },
        { status: 404 },
      );
    }
    if (result.status === "not_verb") {
      return NextResponse.json(
        { error: "Conjugation is only available for verbs." },
        { status: 422 },
      );
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    console.error("Could not generate conjugations", error);
    return NextResponse.json(
      { error: "Could not generate conjugations right now." },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
