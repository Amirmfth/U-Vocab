import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";

async function main() {
  const indexed = await db.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Lexeme" WHERE "embedding" IS NOT NULL`,
  );

  console.log("Indexed lexemes:", indexed[0]?.count.toString() ?? "0");

  const plan = await db.$queryRaw<Array<{ "QUERY PLAN": string }>>(
    Prisma.sql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT candidate."id"
      FROM "Lexeme" candidate
      WHERE candidate."embedding" IS NOT NULL
      ORDER BY candidate."embedding" <=> (
        SELECT source."embedding"
        FROM "Lexeme" source
        WHERE source."embedding" IS NOT NULL
        LIMIT 1
      )
      LIMIT 20
    `,
  );

  console.log(plan.map((row) => row["QUERY PLAN"]).join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
