import { Network } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getUniverseBranch } from "@/lib/universe";
import { UniverseGraph } from "./UniverseGraph";

export const dynamic = "force-dynamic";

export default async function UniversePage({
  searchParams,
}: {
  searchParams: Promise<{ root?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  const requested = params.root
    ? await db.userVocabulary.findUnique({
        where: {
          userId_lexemeId: {
            userId: user.id,
            lexemeId: params.root,
          },
        },
        select: { lexemeId: true },
      })
    : null;

  const fallback = requested
    ? null
    : await db.userVocabulary.findFirst({
        where: { userId: user.id },
        orderBy: [
          { production: "asc" },
          { contextualUsage: "asc" },
          { addedAt: "desc" },
        ],
        select: { lexemeId: true },
      });

  const rootId = requested?.lexemeId ?? fallback?.lexemeId;

  if (!rootId) {
    return (
      <main className="page">
        <section className="empty-state">
          <Network size={22} />
          <strong>Add vocabulary to build your Universe.</strong>
        </section>
      </main>
    );
  }

  const branch = await getUniverseBranch({
    userId: user.id,
    lexemeId: rootId,
  });

  return (
    <main className="page">
      <section className="page-header compact">
        <p className="eyebrow">EXPLORE</p>
        <h1>Vocabulary Universe</h1>
        <p className="page-description">
          Explore exact lexical relationships, topics, learner state, and optional
          semantic neighbors. Click a node to focus it, then expand on demand.
        </p>
      </section>

      <UniverseGraph
        initialRootId={branch.rootId}
        initialNodes={branch.nodes}
        initialEdges={branch.edges}
      />
    </main>
  );
}
