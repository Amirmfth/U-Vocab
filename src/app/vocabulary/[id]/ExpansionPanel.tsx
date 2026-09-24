"use client";

import { useActionState } from "react";
import { Check, Network, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  generateExpansionAction,
  type ExpansionState,
} from "./actions";
import { ExpansionAddForm } from "./ExpansionAddForm";

const initialState: ExpansionState = { status: "idle" };

export function ExpansionPanel({
  lexemeId,
}: {
  lexemeId: string;
}) {
  const [state, action] = useActionState(generateExpansionAction, initialState);

  return (
    <section className="panel intelligence-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">WORD FAMILY</p>
          <h2>Expand this word</h2>
        </div>
        <Network size={20} />
      </div>

      <p className="muted">
        Find useful derivations, phrases, collocations, and semantic neighbors.
      </p>

      <form action={action}>
        <input type="hidden" name="lexemeId" value={lexemeId} />
        <ActionButton pendingLabel="Finding useful vocabulary…">
          <Sparkles size={18} />
          Generate expansion
        </ActionButton>
      </form>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      {state.suggestions?.length ? (
        <div className="expansion-list">
          {state.suggestions.map((item) => (
            <article
              className="expansion-item"
              key={item.lemma + ":" + item.partOfSpeech}
            >
              <div className="expansion-copy">
                <div className="word-meta">
                  <span className="badge">{item.relationType.replaceAll("_", " ")}</span>
                  <span className="badge">usefulness {item.usefulness}/5</span>
                  {item.userState ? <span className="badge">{item.userState}</span> : null}
                </div>
                <h3>{item.article ? item.article + " " : ""}{item.lemma}</h3>
                <p>{item.englishMeaning}</p>
                <p className="rtl">{item.persianMeaning}</p>
                <small className="muted">{item.rationale}</small>
              </div>

              {item.userState ? (
                <span className="expansion-added">
                  <Check size={17} />
                  In vocabulary
                </span>
              ) : (
                <ExpansionAddForm sourceId={lexemeId} item={item} />
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
