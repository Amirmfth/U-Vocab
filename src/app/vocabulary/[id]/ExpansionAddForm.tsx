"use client";

import { useActionState } from "react";
import { Check, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  addExpansionAction,
  type AddExpansionState,
  type ExpansionSuggestion,
} from "./actions";

const initialState: AddExpansionState = { status: "idle" };

export function ExpansionAddForm({
  sourceId,
  item,
}: {
  sourceId: string;
  item: ExpansionSuggestion;
}) {
  const [state, action] = useActionState(addExpansionAction, initialState);

  if (state.status === "success") {
    return (
      <div className="expansion-add-result">
        <span className="expansion-added">
          <Check size={17} />
          Added
        </span>
        <StatusNotice tone="success">{state.message}</StatusNotice>
      </div>
    );
  }

  return (
    <div className="expansion-add-result">
      <form action={action}>
        <input type="hidden" name="sourceId" value={sourceId} />
        <input type="hidden" name="lemma" value={item.lemma} />
        <input type="hidden" name="partOfSpeech" value={item.partOfSpeech} />
        <input type="hidden" name="article" value={item.article ?? ""} />
        <input type="hidden" name="plural" value={item.plural ?? ""} />
        <input type="hidden" name="englishMeaning" value={item.englishMeaning} />
        <input type="hidden" name="persianMeaning" value={item.persianMeaning} />
        <input type="hidden" name="relationType" value={item.relationType} />
        <ActionButton variant="secondary" pendingLabel="Adding…">
          <Plus size={17} />
          Add
        </ActionButton>
      </form>
      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
