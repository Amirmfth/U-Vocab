import { db } from "@/lib/db";
import { rebuildMistakeEmbeddings } from "./embeddings";
import { similarMistakePairs } from "./search";

export async function clusterOpenMistakes(userId: string) {
  await rebuildMistakeEmbeddings({ userId, limit: 30 });

  const mistakes = await db.mistake.findMany({
    where: { userId, resolvedAt: null },
    include: { lexeme: true },
    orderBy: [{ occurrences: "desc" }, { lastOccurredAt: "desc" }],
    take: 100,
  });

  const parent = new Map(mistakes.map((mistake) => [mistake.id, mistake.id]));

  function find(id: string): string {
    const value = parent.get(id) ?? id;
    if (value === id) return id;
    const root = find(value);
    parent.set(id, root);
    return root;
  }

  function unite(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }

  for (const pair of await similarMistakePairs({ userId })) {
    unite(pair.leftId, pair.rightId);
  }

  const groups = new Map<string, typeof mistakes>();
  for (const mistake of mistakes) {
    const root = find(mistake.id);
    groups.set(root, [...(groups.get(root) ?? []), mistake]);
  }

  return Array.from(groups.values())
    .map((items) => ({
      key: items.map((item) => item.id).sort().join(":"),
      items,
      occurrences: items.reduce((sum, item) => sum + item.occurrences, 0),
      latest: items.reduce(
        (latest, item) =>
          item.lastOccurredAt > latest ? item.lastOccurredAt : latest,
        items[0].lastOccurredAt,
      ),
      types: Array.from(new Set(items.map((item) => item.type))),
    }))
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences ||
        b.latest.getTime() - a.latest.getTime(),
    );
}
