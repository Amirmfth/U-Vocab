"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import {
  generateComparisonAction,
  type CompareCreateState,
} from "./actions";

const initialState: CompareCreateState = { status: "idle" };

export function QuickCompareSuggestion({
  leftLexemeId,
  rightLexemeId,
}: {
  leftLexemeId: string;
  rightLexemeId: string;
}) {
  const [state, action] = useActionState(generateComparisonAction, initialState);

  return (
    <div className="quick-compare-action">
      <form action={action}>
        <input type="hidden" name="leftLexemeId" value={leftLexemeId} />
        <input type="hidden" name="rightLexemeId" value={rightLexemeId} />
        <ActionButton variant="secondary" pendingLabel="Generating…">
          <GitCompareArrows size={16} />
          Compare
        </ActionButton>
      </form>

      {state.status === "success" && state.pairId ? (
        <StatusNotice tone="success">
          <Link href={"/compare/" + state.pairId} className="status-link">
            Open trainer <ArrowRight size={15} />
          </Link>
        </StatusNotice>
      ) : null}

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}
    </div>
  );
}
