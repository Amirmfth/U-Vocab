import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { db } from "@/lib/db";
import { getOpenAI } from "@/lib/ai/client";
import { aiRoute } from "@/lib/ai/routing";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const defaultBatchSize = 25;

const responseSchema = z.object({
  levels: z.array(z.object({
    id: z.string(),
    cefrLevel: z.enum(CEFR_LEVELS),
  })),
});

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function batchSize() {
  const value = Number(option("--batch-size") ?? defaultBatchSize);
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error("--batch-size must be an integer from 1 to 50.");
  }
  return value;
}

async function classifyBatch(
  words: Array<{
    id: string;
    lemma: string;
    partOfSpeech: string;
    article: string | null;
    plural: string | null;
    patterns: Array<{ pattern: string }>;
  }>,
) {
  const route = aiRoute("lexical_analysis");
  const response = await getOpenAI().responses.parse({
    model: route.model,
    max_output_tokens: route.maxOutputTokens,
    input: [
      {
        role: "system",
        content:
          "Classify each German lexical unit by its usual CEFR level. Consider the complete lexical unit and its grammar pattern, not only an isolated word. Return one A1, A2, B1, B2, C1, or C2 classification for every supplied id. Do not omit, add, or change ids.",
      },
      {
        role: "user",
        content: JSON.stringify({ words }),
      },
    ],
    text: { format: zodTextFormat(responseSchema, "cefr_level_backfill") },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI did not return valid CEFR classifications.");
  }

  const requestedIds = new Set(words.map((word) => word.id));
  const returnedIds = response.output_parsed.levels.map((item) => item.id);
  if (
    returnedIds.length !== words.length ||
    new Set(returnedIds).size !== words.length ||
    returnedIds.some((id) => !requestedIds.has(id))
  ) {
    throw new Error("OpenAI returned an incomplete or mismatched CEFR batch.");
  }

  return response.output_parsed.levels;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const size = batchSize();
  let updated = 0;

  for (;;) {
    const words = await db.lexeme.findMany({
      where: { cefrLevel: null },
      select: {
        id: true,
        lemma: true,
        partOfSpeech: true,
        article: true,
        plural: true,
        patterns: { select: { pattern: true }, take: 3 },
      },
      orderBy: { createdAt: "asc" },
      take: size,
    });
    if (!words.length) break;

    console.log(`Classifying ${words.length} words (${updated} updated so far)…`);
    const levels = await classifyBatch(words);

    if (dryRun) {
      console.table(levels);
      break;
    }

    const writes = await Promise.all(
      levels.map(({ id, cefrLevel }) =>
        db.lexeme.updateMany({
          where: { id, cefrLevel: null },
          data: { cefrLevel },
        }),
      ),
    );
    updated += writes.reduce((sum, result) => sum + result.count, 0);
  }

  console.log(dryRun ? "Dry run complete; no levels were saved." : `Done. Updated ${updated} words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
