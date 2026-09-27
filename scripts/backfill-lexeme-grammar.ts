import { db } from "../src/lib/db";
import { syncDeterministicGrammarLinksForLexeme } from "../src/lib/grammar/lexeme-links";

async function main() {
  const lexemes = await db.lexeme.findMany({
    where: { language: "de" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let linked = 0;
  for (const lexeme of lexemes) {
    const links = await syncDeterministicGrammarLinksForLexeme(lexeme.id);
    if (links.length) linked += 1;
  }

  console.log(`Backfilled grammar links for ${linked}/${lexemes.length} German lexemes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
