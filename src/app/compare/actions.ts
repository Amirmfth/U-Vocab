"use server";

export type CompareCreateState = {
  status: "idle" | "success" | "error";
  message?: string;
  pairId?: string;
};

const disabledMessage = "Word Compare is disabled.";

export async function generateComparisonAction(
  _previous: CompareCreateState,
  _formData: FormData,
): Promise<CompareCreateState> {
  return { status: "error", message: disabledMessage };
}

export async function recordComparisonChoice(_input: {
  pairId: string;
  questionIndex: number;
  selected: "LEFT" | "RIGHT";
}): Promise<never> {
  throw new Error(disabledMessage);
}

export async function evaluateComparisonProduction(_input: {
  pairId: string;
  target: "LEFT" | "RIGHT";
  answer: string;
}): Promise<never> {
  throw new Error(disabledMessage);
}
