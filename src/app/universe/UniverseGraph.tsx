"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  GitBranch,
  LoaderCircle,
  Network,
  Plus,
  Sparkles,
} from "lucide-react";
import type {
  UniverseEdge,
  UniverseNode,
} from "@/lib/universe";
import {
  addUniverseSuggestion,
  expandUniverseNode,
  learnUniverseNode,
  suggestUniverseExpansion,
} from "./actions";

type Suggestion = {
  lemma: string;
  partOfSpeech: string;
  article: string | null;
  plural: string | null;
  englishMeaning: string;
  persianMeaning: string;
  relationType: string;
  rationale: string;
  usefulness: number;
};

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  return Array.from(
    new Map([...current, ...incoming].map((item) => [item.id, item])).values(),
  );
}

export function UniverseGraph({
  initialRootId,
  initialNodes,
  initialEdges,
}: {
  initialRootId: string;
  initialNodes: UniverseNode[];
  initialEdges: UniverseEdge[];
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedId, setSelectedId] = useState(initialRootId);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingExpand, startExpand] = useTransition();
  const [pendingLearn, startLearn] = useTransition();
  const [pendingAI, startAI] = useTransition();
  const [pendingSuggestion, startSuggestion] = useTransition();

  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  const visible = useMemo(() => {
    if (!selected) return { nodes: [], edges: [] as UniverseEdge[] };
    const connectedEdges = edges.filter(
      (edge) => edge.source === selected.id || edge.target === selected.id,
    );
    const ids = new Set<string>([selected.id]);
    for (const edge of connectedEdges) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
    return {
      nodes: nodes.filter((node) => ids.has(node.id)),
      edges: connectedEdges,
    };
  }, [edges, nodes, selected]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!selected) return map;
    map.set(selected.id, { x: 400, y: 280 });
    const others = visible.nodes.filter((node) => node.id !== selected.id);
    others.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(others.length, 1) - Math.PI / 2;
      map.set(node.id, {
        x: 400 + Math.cos(angle) * 255,
        y: 280 + Math.sin(angle) * 190,
      });
    });
    return map;
  }, [selected, visible.nodes]);

  async function expand(includeSemantic: boolean) {
    if (!selected?.lexemeId) return;
    setStatus(null);
    startExpand(async () => {
      try {
        const branch = await expandUniverseNode({
          lexemeId: selected.lexemeId!,
          includeSemantic,
        });
        setNodes((current) => mergeById(current, branch.nodes));
        setEdges((current) => mergeById(current, branch.edges));
        setStatus(
          includeSemantic
            ? "Expanded with exact and semantic neighbors."
            : "Branch expanded.",
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not expand branch.");
      }
    });
  }

  async function learnSelected() {
    if (!selected?.lexemeId) return;
    setStatus(null);
    startLearn(async () => {
      try {
        await learnUniverseNode(selected.lexemeId!);
        setNodes((current) =>
          current.map((node) =>
            node.id === selected.id ? { ...node, state: "learning" } : node,
          ),
        );
        setStatus("Added to your vocabulary.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not add this word.");
      }
    });
  }

  async function generateSuggestions() {
    if (!selected?.lexemeId) return;
    setStatus(null);
    startAI(async () => {
      try {
        const result = await suggestUniverseExpansion(selected.lexemeId!);
        setSuggestions(result.suggestions);
        setStatus("AI expansion ready.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not generate expansion.");
      }
    });
  }

  async function addSuggestion(item: Suggestion) {
    if (!selected?.lexemeId) return;
    setStatus(null);
    startSuggestion(async () => {
      try {
        const result = await addUniverseSuggestion({
          sourceId: selected.lexemeId!,
          lemma: item.lemma,
          partOfSpeech: item.partOfSpeech,
          article: item.article,
          plural: item.plural,
          englishMeaning: item.englishMeaning,
          persianMeaning: item.persianMeaning,
          relationType: item.relationType,
        });
        const branch = await expandUniverseNode({
          lexemeId: selected.lexemeId!,
        });
        setNodes((current) => mergeById(current, branch.nodes));
        setEdges((current) => mergeById(current, branch.edges));
        setSuggestions((current) =>
          current.filter(
            (suggestion) =>
              suggestion.lemma !== item.lemma ||
              suggestion.partOfSpeech !== item.partOfSpeech,
          ),
        );
        setStatus("Added and linked in the graph.");
        setSelectedId(result.lexemeId);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not add suggestion.");
      }
    });
  }

  if (!selected) return null;

  return (
    <div className="universe-layout">
      <section className="panel universe-canvas-wrap">
        <div className="universe-toolbar">
          <div>
            <p className="eyebrow">VOCABULARY UNIVERSE</p>
            <strong>{selected.label}</strong>
          </div>
          <div className="universe-toolbar-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={pendingExpand || !selected.lexemeId}
              onClick={() => expand(false)}
            >
              {pendingExpand ? <LoaderCircle className="spinner" size={16} /> : <GitBranch size={16} />}
              Expand
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={pendingExpand || !selected.lexemeId}
              onClick={() => expand(true)}
            >
              <Network size={16} />
              Semantic
            </button>
          </div>
        </div>

        <div className="universe-canvas">
          <svg viewBox="0 0 800 560" role="img" aria-label="Interactive vocabulary graph">
            {visible.edges.map((edge) => {
              const source = positions.get(edge.source);
              const target = positions.get(edge.target);
              if (!source || !target) return null;
              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    className={edge.semantic ? "universe-edge semantic" : "universe-edge"}
                  />
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2 - 6}
                    className="universe-edge-label"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {visible.nodes.map((node) => {
              const position = positions.get(node.id);
              if (!position) return null;
              const active = node.id === selected.id;
              return (
                <g
                  key={node.id}
                  className={"universe-node universe-state-" + node.state + (active ? " is-active" : "")}
                  onClick={() => {
                    setSelectedId(node.id);
                    setSuggestions([]);
                    setStatus(null);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedId(node.id);
                  }}
                >
                  <circle cx={position.x} cy={position.y} r={active ? 54 : 44} />
                  <text x={position.x} y={position.y - 2} textAnchor="middle">
                    {node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label}
                  </text>
                  <text
                    x={position.x}
                    y={position.y + 16}
                    textAnchor="middle"
                    className="universe-node-sub"
                  >
                    {node.sublabel ?? node.state}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      <aside className="panel universe-detail">
        <div className="word-meta">
          <span className="badge">{selected.kind.toLowerCase()}</span>
          <span className="badge">{selected.state}</span>
        </div>
        <h2>{selected.label}</h2>
        {selected.sublabel ? <p className="muted">{selected.sublabel}</p> : null}

        {selected.lexemeId ? (
          <div className="universe-detail-actions">
            <Link
              href={"/vocabulary/" + selected.lexemeId}
              className="button button-secondary"
            >
              <BookOpen size={17} />
              Open details
            </Link>

            {selected.state === "unknown" ? (
              <button
                type="button"
                className="button button-primary"
                disabled={pendingLearn}
                onClick={learnSelected}
              >
                {pendingLearn ? <LoaderCircle className="spinner" size={17} /> : <Plus size={17} />}
                {pendingLearn ? "Adding…" : "Learn this"}
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                disabled={pendingAI}
                onClick={generateSuggestions}
              >
                {pendingAI ? <LoaderCircle className="spinner" size={17} /> : <Sparkles size={17} />}
                {pendingAI ? "Generating…" : "AI expand"}
              </button>
            )}
          </div>
        ) : null}

        {status ? <p className="universe-status" aria-live="polite">{status}</p> : null}

        {suggestions.length ? (
          <div className="universe-suggestions">
            <p className="eyebrow">SUGGESTED BRANCHES</p>
            {suggestions.map((item) => (
              <article
                className="universe-suggestion"
                key={item.lemma + ":" + item.partOfSpeech}
              >
                <div>
                  <strong>{item.article ? item.article + " " : ""}{item.lemma}</strong>
                  <span>{item.relationType.replaceAll("_", " ").toLowerCase()} · usefulness {item.usefulness}/5</span>
                  <small>{item.rationale}</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  disabled={pendingSuggestion}
                  onClick={() => addSuggestion(item)}
                  aria-label={"Add " + item.lemma}
                >
                  {pendingSuggestion ? <LoaderCircle className="spinner" size={16} /> : <Plus size={16} />}
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
