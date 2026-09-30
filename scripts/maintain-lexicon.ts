import { db } from "../src/lib/db";
import { lexiconAdapter } from "../src/lib/lexicon/normalization";

async function backfill(write: boolean) {
  const lexemes = await db.lexeme.findMany({
    select: {
      id: true,
      language: true,
      lemma: true,
      normalized: true,
      partOfSpeech: true,
      article: true,
      createdAt: true,
      translations: {
        select: { id: true, senseId: true },
      },
      aliases: {
        select: { id: true },
        take: 1,
      },
      senses: {
        where: { key: "default" },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let aliasesAdded = 0;
  let sensesAdded = 0;
  let translationsLinked = 0;

  for (const lexeme of lexemes) {
    let senseId = lexeme.senses[0]?.id ?? null;

    if (!senseId && write) {
      const sense = await db.lexemeSense.upsert({
        where: { lexemeId_key: { lexemeId: lexeme.id, key: "default" } },
        create: {
          lexemeId: lexeme.id,
          key: "default",
          source: "IMPORTED",
          reviewState: "ACCEPTED",
        },
        update: {},
      });
      senseId = sense.id;
      sensesAdded += 1;
    } else if (!senseId) {
      sensesAdded += 1;
    }

    if (senseId) {
      const missingSenseIds = lexeme.translations
        .filter((translation) => !translation.senseId)
        .map((translation) => translation.id);
      translationsLinked += missingSenseIds.length;
      if (write && missingSenseIds.length) {
        await db.translation.updateMany({
          where: { id: { in: missingSenseIds } },
          data: { senseId },
        });
      }
    }

    if (!lexeme.aliases.length) {
      aliasesAdded += 1;
      if (write) {
        await db.lexemeAlias.upsert({
          where: {
            language_normalizedSurface_lexemeId: {
              language: lexeme.language,
              normalizedSurface: lexeme.normalized,
              lexemeId: lexeme.id,
            },
          },
          create: {
            lexemeId: lexeme.id,
            language: lexeme.language,
            surface: lexeme.lemma,
            normalizedSurface: lexeme.normalized,
            kind: "IMPORTED",
            source: "IMPORTED",
          },
          update: {},
        });
      }
    }
  }

  return { aliasesAdded, sensesAdded, translationsLinked };
}

async function audit() {
  const lexemes = await db.lexeme.findMany({
    select: {
      id: true,
      language: true,
      lemma: true,
      normalized: true,
      partOfSpeech: true,
    },
  });

  const normalizedGroups = new Map<string, typeof lexemes>();
  for (const lexeme of lexemes) {
    const adapter =
      lexeme.language === "de"
        ? lexiconAdapter("GERMAN")
        : lexeme.language === "fr"
          ? lexiconAdapter("FRENCH")
          : lexiconAdapter("ENGLISH");
    const normalized = adapter.normalizeCanonical(lexeme.lemma, lexeme.partOfSpeech);
    const key = [lexeme.language, normalized, lexeme.partOfSpeech].join(":");
    const group = normalizedGroups.get(key) ?? [];
    group.push(lexeme);
    normalizedGroups.set(key, group);
  }

  const probableDuplicates = Array.from(normalizedGroups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      ids: items.map((item) => item.id),
      lemmas: items.map((item) => item.lemma),
    }));

  const aliasRows = await db.lexemeAlias.findMany({
    select: {
      language: true,
      normalizedSurface: true,
      lexemeId: true,
    },
  });
  const aliasGroups = new Map<string, Set<string>>();
  for (const alias of aliasRows) {
    const key = alias.language + ":" + alias.normalizedSurface;
    const ids = aliasGroups.get(key) ?? new Set<string>();
    ids.add(alias.lexemeId);
    aliasGroups.set(key, ids);
  }
  const aliasCollisions = Array.from(aliasGroups.entries())
    .filter(([, ids]) => ids.size > 1)
    .map(([key, ids]) => ({ key, lexemeIds: Array.from(ids) }));

  const ambiguousCanonicalForms = Array.from(
    lexemes.reduce((map, lexeme) => {
      const key = lexeme.language + ":" + lexeme.normalized;
      const set = map.get(key) ?? new Set<string>();
      set.add(lexeme.partOfSpeech);
      map.set(key, set);
      return map;
    }, new Map<string, Set<string>>()).entries(),
  )
    .filter(([, parts]) => parts.size > 1)
    .map(([key, parts]) => ({ key, partsOfSpeech: Array.from(parts) }));

  return { probableDuplicates, aliasCollisions, ambiguousCanonicalForms };
}

async function main() {
  const write = process.argv.includes("--write");
  const backfillResult = await backfill(write);
  const report = await audit();

  console.log(write ? "Lexicon backfill completed." : "Lexicon dry-run completed.");
  console.table(backfillResult);

  console.log("\nProbable duplicate canonical lexemes:");
  console.dir(report.probableDuplicates, { depth: null });

  console.log("\nAlias collisions:");
  console.dir(report.aliasCollisions, { depth: null });

  console.log("\nAmbiguous same-surface records across parts of speech:");
  console.dir(report.ambiguousCanonicalForms, { depth: null });

  if (!write) {
    console.log("\nRun with --write to create only missing default aliases/senses and link legacy translations.");
  }
  console.log("No duplicate or collision is auto-merged by this script.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
