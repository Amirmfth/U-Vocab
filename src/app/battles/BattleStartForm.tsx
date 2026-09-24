"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import { createBattleAction, type BattleActionState } from "./actions";

const initialState: BattleActionState = { status: "idle" };

export function BattleStartForm() {
  const router = useRouter();
  const [state, action] = useActionState(createBattleAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.sessionId) {
      router.push("/battles/" + state.sessionId);
    }
  }, [router, state]);

  return (
    <form action={action} className="panel battle-start-form">
      <div className="field">
        <label htmlFor="battle-game-trigger">Game</label>
        <ActivitySelect
          id="battle-game"
          name="game"
          defaultValue="RAPID_RECALL"
          options={[
            { value: "RAPID_RECALL", label: "Rapid Recall" },
            { value: "ARTICLE", label: "Article Battle" },
            { value: "COLLOCATION", label: "Collocation Battle" },
            { value: "ODD_ONE_OUT", label: "Odd One Out" },
            { value: "SYNONYM", label: "Synonym challenge" },
            { value: "PREPOSITION", label: "Phrase / preposition" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="battle-mode-trigger">Mode</label>
        <ActivitySelect
          id="battle-mode"
          name="mode"
          defaultValue="TIMED"
          options={[
            { value: "TIMED", label: "Timed" },
            { value: "UNTIMED", label: "Untimed" },
          ]}
        />
      </div>

      <div className="field">
        <label htmlFor="battle-duration-trigger">Timed length</label>
        <ActivitySelect
          id="battle-duration"
          name="durationSec"
          defaultValue="90"
          options={[
            { value: "60", label: "1 minute" },
            { value: "90", label: "90 seconds" },
            { value: "180", label: "3 minutes" },
          ]}
        />
      </div>

      {state.status === "error" ? (
        <StatusNotice tone="error">{state.message}</StatusNotice>
      ) : null}

      <ActionButton pendingLabel="Building battle…">
        <Swords size={18} />
        Start battle
      </ActionButton>
    </form>
  );
}
