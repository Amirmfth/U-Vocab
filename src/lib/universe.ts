import { db } from "@/lib/db";
import { findSimilarLexemes } from "@/lib/semantic/search";

export type UniverseNode = {
  id: string;
  kind: "LEXEME" | "TOPIC";
  label: string;
  sublabel: string | null;
  state: "unknown" | "learning" | "known" | "mastered" | "weak" | "topic";
  lexemeId: string | null;
};

export type UniverseEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  semantic?: boolean;
};

function learnerState(
  state: string | undefined,
  production: number | undefined,
  contextualUsage: number | undefined,
): UniverseNode["state"] {
  if (!state) return "unknown";
  if (["MASTERED", "MAINTENANCE"].includes(state)) return "mastered";
  if ((production ?? 0) < 0.4 || (contextualUsage ?? 0) < 0.4) return "weak";
  if (["NEW", "LEARNING", "FAMILIAR"].includes(state)) return "learning";
  return "known";
}

export async function getUniverseBranch(input: {
  userId: string;
  lexemeId: string;
  includeSemantic?: boolean;
}) {
  const root = await db.lexeme.findUnique({
    where: { id: input.lexemeId },
    include: {
      translations: true,
      userStates: { where: { userId: input.userId }, take: 1 },
      outgoing: {
        include: {
          target: {
            include: {
              userStates: { where: { userId: input.userId }, take: 1 },
            },
          },
        },
        take: 20,
      },
      incoming: {
        include: {
          source: {
            include: {
              userStates: { where: { userId: input.userId }, take: 1 },
            },
          },
        },
        take: 20,
      },
      topicPackItems: {
        include: { topicPack: true },
        take: 12,
      },
    },
  });
  if (!root) throw new Error("Lexical unit not found.");

  const nodes = new Map<string, UniverseNode>();
  const edges = new Map<string, UniverseEdge>();
  const rootState = root.userStates[0];

  nodes.set(root.id, {
    id: root.id,
    kind: "LEXEME",
    label: (root.article ? root.article + " " : "") + root.lemma,
    sublabel: root.partOfSpeech,
    state: learnerState(
      rootState?.state,
      rootState?.production,
      rootState?.contextualUsage,
    ),
    lexemeId: root.id,
  });

  for (const relation of root.outgoing) {
    const targetState = relation.target.userStates[0];
    nodes.set(relation.target.id, {
      id: relation.target.id,
      kind: "LEXEME",
      label:
        (relation.target.article ? relation.target.article + " " : "") +
        relation.target.lemma,
      sublabel: relation.target.partOfSpeech,
      state: learnerState(
        targetState?.state,
        targetState?.production,
        targetState?.contextualUsage,
      ),
      lexemeId: relation.target.id,
    });
    edges.set(relation.id, {
      id: relation.id,
      source: root.id,
      target: relation.target.id,
      label: relation.type.replaceAll("_", " ").toLowerCase(),
    });
  }

  for (const relation of root.incoming) {
    const sourceState = relation.source.userStates[0];
    nodes.set(relation.source.id, {
      id: relation.source.id,
      kind: "LEXEME",
      label:
        (relation.source.article ? relation.source.article + " " : "") +
        relation.source.lemma,
      sublabel: relation.source.partOfSpeech,
      state: learnerState(
        sourceState?.state,
        sourceState?.production,
        sourceState?.contextualUsage,
      ),
      lexemeId: relation.source.id,
    });
    edges.set(relation.id, {
      id: relation.id,
      source: relation.source.id,
      target: root.id,
      label: relation.type.replaceAll("_", " ").toLowerCase(),
    });
  }

  for (const membership of root.topicPackItems) {
    const topicId = "topic:" + membership.topicPack.id;
    nodes.set(topicId, {
      id: topicId,
      kind: "TOPIC",
      label: membership.topicPack.topic,
      sublabel: membership.topicPack.title,
      state: "topic",
      lexemeId: null,
    });
    edges.set("topic-edge:" + membership.id, {
      id: "topic-edge:" + membership.id,
      source: root.id,
      target: topicId,
      label: "topic",
    });
  }

  if (input.includeSemantic) {
    try {
      const semantic = await findSimilarLexemes({
        userId: input.userId,
        lexemeId: root.id,
        limit: 8,
      });
      for (const item of semantic) {
        if (nodes.has(item.lexeme.id) || item.similarity < 0.68) continue;
        const state = await db.userVocabulary.findUnique({
          where: {
            userId_lexemeId: {
              userId: input.userId,
              lexemeId: item.lexeme.id,
            },
          },
        });
        nodes.set(item.lexeme.id, {
          id: item.lexeme.id,
          kind: "LEXEME",
          label:
            (item.lexeme.article ? item.lexeme.article + " " : "") +
            item.lexeme.lemma,
          sublabel: "semantic " + Math.round(item.similarity * 100) + "%",
          state: learnerState(
            state?.state,
            state?.production,
            state?.contextualUsage,
          ),
          lexemeId: item.lexeme.id,
        });
        edges.set("semantic:" + root.id + ":" + item.lexeme.id, {
          id: "semantic:" + root.id + ":" + item.lexeme.id,
          source: root.id,
          target: item.lexeme.id,
          label: "semantic",
          semantic: true,
        });
      }
    } catch {
      // Exact graph remains usable if semantic indexing is unavailable.
    }
  }

  return {
    rootId: root.id,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}
