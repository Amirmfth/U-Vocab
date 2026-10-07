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
    <form action={action} className="panel battle-start-form [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] min-[620px]:[&_>_.status-notice]:[grid-column:1_/_-1] min-[620px]:[&_>_.button]:[grid-column:1_/_-1] [border-radius:18px]">
      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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

      <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
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
