export type DecisionRolloutMode = "off" | "shadow" | "on";

const VALID = new Set<DecisionRolloutMode>(["off", "shadow", "on"]);

function parse(value: string | undefined): DecisionRolloutMode | null {
  const normalized = value?.trim().toLowerCase() as DecisionRolloutMode | undefined;
  return normalized && VALID.has(normalized) ? normalized : null;
}

export function decisionRolloutMode(
  operationEnv: string,
  legacyEnabled = false,
): DecisionRolloutMode {
  if (process.env.OPENAI_DECISIONS_ENABLED === "false") return "off";
  const explicit = parse(process.env[operationEnv]);
  if (explicit) return explicit;
  if (process.env.OPENAI_DECISIONS_ENABLED === "true") return "on";
  return legacyEnabled ? "on" : "off";
}

export function shouldRunNativeDecision(mode: DecisionRolloutMode) {
  return mode === "shadow" || mode === "on";
}

export function shouldUseNativeDecision(mode: DecisionRolloutMode) {
  return mode === "on";
}
