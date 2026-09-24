"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import {
  generateComparisonAction,
  type CompareCreateState,
} from "./actions";

const initialState: CompareCreateState = { status: "idle" };

export function CompareForm({
  options,
  defaultLeft,
  defaultRight,
}: {
  options: Array<{ value: string; label: string }>;
  defaultLeft?: string;
  defaultRight?: string;
}) {
  const [state, action] = useActionState(generateComparisonAction, initialState);

  return (
    <form action={action} className="panel compare-form">
      <div className="compare-select-grid">
        <div className="field">
          <label htmlFor="leftLexemeId-trigger">First lexical unit</label>
          <ActivitySelect
            id="leftLexemeId"
            name="leftLexemeId"
            defaultValue={defaultLeft ?? options[0]?.value ?? ""}
            options={options}
          />
        </div>
        <div className="field">
          <label htmlFor="rightLexemeId-trigger">Second lexical unit</label>
          <ActivitySelect
            id="rightLexemeId"
            name="rightLexemeId"
            defaultValue={defaultRight ?? options[1]?.value ?? options[0]?.value ?? ""}
            options={options}
          />
        </div>
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      {state.status === "success" && state.pairId ? (
        <StatusNotice tone="success">
          {state.message}
          <Link href={"/compare/" + state.pairId} className="status-link">
            Open trainer <ArrowRight size={15} />
          </Link>
        </StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Building comparison…">
        <Sparkles size={17} />
        Generate comparison
      </ActionButton>
    </form>
  );
}
