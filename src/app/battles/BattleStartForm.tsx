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
    <form action={action} className="panel battle-start-form uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex flex-col gap-3.5 uv-min620:grid uv-min620:uv-grid-template-columns-dd0b1a1848 uv-min620:uv-vae41d3c771:uv-grid-column-93b665dfb5 uv-min620:uv-ve7e0cd887c:uv-grid-column-93b665dfb5 rounded-uv-r6d27d54c6c">
      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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

      <div className="field flex flex-col gap-2 uv-v586b3820a5:text-uv-text-soft uv-v586b3820a5:text-uv-f845cf53f3a uv-v586b3820a5:uv-weight-560">
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
