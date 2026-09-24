export type AIOperation =
  | "lexical_analysis"
  | "answer_evaluation"
  | "writing_task"
  | "writing_evaluation"
  | "reading_analysis"
  | "conversation_setup"
  | "conversation_turn_evaluation"
  | "conversation_final_evaluation"
  | "conversation_tutor"
  | "word_comparison"
  | "word_expansion"
  | "lexical_insight"
  | "story_generation"
  | "topic_pack_generation";

type Route = {
  model: string;
  maxOutputTokens: number;
};

const DEFAULT_COMPLEX_MODEL = process.env.OPENAI_COMPLEX_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-mini";
const DEFAULT_FAST_MODEL = process.env.OPENAI_FAST_MODEL ?? "gpt-6-luna";

const ROUTES: Record<AIOperation, Route> = {
  lexical_analysis: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 1800 },
  answer_evaluation: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 900 },
  writing_task: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 700 },
  writing_evaluation: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 4200 },
  reading_analysis: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 3200 },
  conversation_setup: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 800 },
  conversation_turn_evaluation: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 900 },
  conversation_final_evaluation: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 2200 },
  conversation_tutor: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 900 },
  word_comparison: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 2400 },
  word_expansion: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 1600 },
  lexical_insight: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 2200 },
  story_generation: { model: DEFAULT_COMPLEX_MODEL, maxOutputTokens: 3600 },
  topic_pack_generation: { model: DEFAULT_FAST_MODEL, maxOutputTokens: 2600 },
};

function envKey(operation: AIOperation) {
  return "OPENAI_MODEL_" + operation.toUpperCase();
}

export function aiRoute(operation: AIOperation): Route {
  const route = ROUTES[operation];
  return {
    ...route,
    model: process.env[envKey(operation)] ?? route.model,
  };
}

export const AI_OPERATION_BUDGETS = ROUTES;
