import { db } from "../src/lib/db";
import {
  generateAndPersistGrammarLesson,
  grammarLessonNeedsRefresh,
} from "../src/lib/grammar/lessons";

function argValue(name: string) {
  const prefix = "--" + name + "=";
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const force = process.argv.includes("--force");
  const only = argValue("concept");
  const parsedLimit = Number(argValue("limit") ?? "0");
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

  const concepts = await db.grammarConcept.findMany({
    where: {
      active: true,
      language: "de",
      ...(only ? { id: only } : {}),
    },
    include: {
      lesson: { select: { sourceContentVersion: true } },
    },
    orderBy: [{ introducedAt: "asc" }, { order: "asc" }],
  });

  const pending = concepts
    .filter(
      (concept) =>
        force ||
        grammarLessonNeedsRefresh({
          lesson: concept.lesson,
          contentVersion: concept.contentVersion,
        }),
    )
    .slice(0, limit ?? concepts.length);

  console.log(
    `Grammar lesson backfill: ${pending.length}/${concepts.length} concept(s) pending${force ? " (force)" : ""}.`,
  );

  const failures: Array<{ id: string; error: string }> = [];

  for (const [index, concept] of pending.entries()) {
    process.stdout.write(
      `[${index + 1}/${pending.length}] ${concept.id} — ${concept.title} ... `,
    );
    try {
      await generateAndPersistGrammarLesson(db, {
        grammarConceptId: concept.id,
      });
      console.log("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: concept.id, error: message });
      console.log("failed: " + message);
    }
  }

  if (failures.length) {
    console.error("\nFailed grammar lessons:");
    for (const failure of failures) {
      console.error("- " + failure.id + ": " + failure.error);
    }
    process.exitCode = 1;
  } else {
    console.log("\nGrammar lesson backfill complete.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
