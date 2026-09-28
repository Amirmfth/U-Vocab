import { db } from "../src/lib/db";
import {
  generateAndPersistGrammarLesson,
  grammarLessonNeedsRefresh,
} from "../src/lib/grammar/lessons";

function argValue(name: string) {
  const prefix = "--" + name + "=";
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function timestamp() {
  return new Date().toISOString();
}

function elapsed(startedAt: number) {
  return `${Math.round((Date.now() - startedAt) / 1000)}s`;
}

async function main() {
  const runStartedAt = Date.now();
  const force = process.argv.includes("--force");
  const only = argValue("concept");
  const languageArg = argValue("language");
  if (languageArg && !["en", "fa"].includes(languageArg)) {
    throw new Error("--language must be en or fa.");
  }
  const languages = (languageArg ? [languageArg] : ["en", "fa"]) as Array<"en" | "fa">;
  const parsedLimit = Number(argValue("limit") ?? "0");
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

  const concepts = await db.grammarConcept.findMany({
    where: {
      active: true,
      language: "de",
      ...(only ? { id: only } : {}),
    },
    include: {
      lessons: { select: { language: true, sourceContentVersion: true } },
    },
    orderBy: [{ introducedAt: "asc" }, { order: "asc" }],
  });

  const allPending = concepts
    .flatMap((concept) => languages
      .filter((language) => force || grammarLessonNeedsRefresh({
        lesson: concept.lessons.find((lesson) => lesson.language === language) ?? null,
        contentVersion: concept.contentVersion,
      }))
      .map((language) => ({ concept, language })));
  const pending = allPending.slice(0, limit ?? allPending.length);

  console.log(
    `[${timestamp()}] Grammar lesson backfill started: ${concepts.length} concept(s), ` +
      `${allPending.length} lesson(s) need processing, ${pending.length} selected. ` +
      `Languages: ${languages.join(", ")}; mode: ${force ? "force regenerate" : "missing or stale only"}` +
      `${only ? `; concept: ${only}` : ""}${limit ? `; limit: ${limit}` : ""}.`,
  );

  const failures: Array<{ id: string; error: string }> = [];
  let completed = 0;

  for (const [index, { concept, language }] of pending.entries()) {
    const itemStartedAt = Date.now();
    const label = `[${index + 1}/${pending.length}] ${concept.id} (${language}) — ${concept.title}`;
    console.log(`[${timestamp()}] START ${label}`);
    const heartbeat = setInterval(() => {
      console.log(`[${timestamp()}] WORKING ${label} (${elapsed(itemStartedAt)} elapsed)`);
    }, 15_000);
    try {
      await generateAndPersistGrammarLesson(db, {
        grammarConceptId: concept.id,
        language,
      });
      completed += 1;
      console.log(`[${timestamp()}] DONE ${label} (${elapsed(itemStartedAt)}; ${completed} succeeded, ${failures.length} failed)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: `${concept.id} (${language})`, error: message });
      console.error(`[${timestamp()}] FAILED ${label} after ${elapsed(itemStartedAt)}: ${message}`);
    } finally {
      clearInterval(heartbeat);
    }
  }

  console.log(
    `[${timestamp()}] Grammar lesson backfill finished in ${elapsed(runStartedAt)}: ` +
      `${completed} succeeded, ${failures.length} failed, ${allPending.length - pending.length} pending beyond this run's limit.`,
  );
  if (failures.length) {
    console.error("\nFailed grammar lessons:");
    for (const failure of failures) {
      console.error("- " + failure.id + ": " + failure.error);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
