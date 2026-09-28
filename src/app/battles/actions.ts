"use server";

export type BattleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  sessionId?: string;
};

const disabledMessage = "Battles are currently disabled.";

export async function createBattleAction(
  _previous: BattleActionState,
  _formData: FormData,
): Promise<BattleActionState> {
  return { status: "error", message: disabledMessage };
}

export async function answerBattleQuestion(_input: {
  sessionId: string;
  questionId: string;
  answer: string;
  responseMs: number;
}): Promise<never> {
  throw new Error(disabledMessage);
}

export async function completeBattle(_sessionId: string): Promise<never> {
  throw new Error(disabledMessage);
}
