import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";

const REASONS = new Set([
  "WEAKNESS",
  "CONTINUE",
  "PREREQUISITE",
  "NEXT_TARGET",
]);
const SURFACES = new Set(["home", "focus", "practice"]);
const ACTIONS = new Set(["learn", "practice"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conceptId = url.searchParams.get("concept") ?? "";
  const reason = url.searchParams.get("reason") ?? "";
  const surface = url.searchParams.get("surface") ?? "";
  const action = url.searchParams.get("action") ?? "";

  const [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  const concept = await db.grammarConcept.findFirst({
    where: { id: conceptId, active: true, language: "de" },
    select: { id: true, slug: true },
  });

  if (
    !concept ||
    !REASONS.has(reason) ||
    !SURFACES.has(surface) ||
    !ACTIONS.has(action)
  ) {
    return NextResponse.redirect(new URL("/grammar", request.url));
  }

  await db.grammarRecommendationEvent.create({
    data: {
      userId: user.id,
      grammarConceptId: concept.id,
      surface,
      reason,
      action,
    },
  });

  const destination =
    action === "practice"
      ? "/practice?grammar=" + encodeURIComponent(concept.slug)
      : "/grammar/" + encodeURIComponent(concept.slug);
  return NextResponse.redirect(new URL(destination, request.url));
}
