export type AIOperation =
  | "lexical_analysis"
  | "lexical_batch_analysis"
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
  | "lexical_examples"
  | "quick_teach"
  | "story_generation"
  | "topic_pack_generation"
  | "verb_conjugation"
  | "grammar_lesson"
  | "grammar_quick_teach"
  | "recommendation_rerank"
  | "lexical_edge_rerank"
  | "daily_session_plan";

export type AIRoutingReason =
  | "STATIC_FAST"
  | "STATIC_COMPLEX"
  | "REQUEST_COMPLEXITY_FAST"
  | "REQUEST_COMPLEXITY_COMPLEX"
  | "ENV_OVERRIDE"
  | "FALLBACK";

type RouteClass = "FAST" | "COMPLEX";

export type AIRoute = {
  model: string;
  maxOutputTokens: number;
  reason: AIRoutingReason;
  routeClass: RouteClass;
};

const DEFAULT_COMPLEX_MODEL =
  process.env.OPENAI_COMPLEX_MODEL ??
  process.env.OPENAI_MODEL ??
  "gpt-6.1-sol";
const DEFAULT_FAST_MODEL = process.env.OPENAI_FAST_MODEL ?? "gpt-6-luna";

const ROUTES: Record<AIOperation, { routeClass: RouteClass; maxOutputTokens: number }> = {
  lexical_analysis: { routeClass: "COMPLEX", maxOutputTokens: 1800 },
  lexical_batch_analysis: { routeClass: "COMPLEX", maxOutputTokens: 6500 },
  answer_evaluation: { routeClass: "FAST", maxOutputTokens: 900 },
  writing_task: { routeClass: "FAST", maxOutputTokens: 700 },
  writing_evaluation: { routeClass: "COMPLEX", maxOutputTokens: 4200 },
  reading_analysis: { routeClass: "COMPLEX", maxOutputTokens: 3200 },
  conversation_setup: { routeClass: "FAST", maxOutputTokens: 800 },
  conversation_turn_evaluation: { routeClass: "FAST", maxOutputTokens: 900 },
  conversation_final_evaluation: { routeClass: "COMPLEX", maxOutputTokens: 2200 },
  conversation_tutor: { routeClass: "FAST", maxOutputTokens: 900 },
  word_comparison: { routeClass: "COMPLEX", maxOutputTokens: 2400 },
  word_expansion: { routeClass: "FAST", maxOutputTokens: 1600 },
  lexical_insight: { routeClass: "COMPLEX", maxOutputTokens: 2200 },
  lexical_examples: { routeClass: "FAST", maxOutputTokens: 1300 },
  quick_teach: { routeClass: "FAST", maxOutputTokens: 1100 },
  story_generation: { routeClass: "COMPLEX", maxOutputTokens: 3600 },
  topic_pack_generation: { routeClass: "FAST", maxOutputTokens: 2600 },
  verb_conjugation: { routeClass: "COMPLEX", maxOutputTokens: 5200 },
  grammar_lesson: { routeClass: "COMPLEX", maxOutputTokens: 8200 },
  grammar_quick_teach: { routeClass: "COMPLEX", maxOutputTokens: 2200 },
  recommendation_rerank: { routeClass: "FAST", maxOutputTokens: 420 },
  lexical_edge_rerank: { routeClass: "FAST", maxOutputTokens: 320 },
  daily_session_plan: { routeClass: "FAST", maxOutputTokens: 320 },
};

const COMPLEXITY_ROUTABLE = new Set<AIOperation>([
  "writing_evaluation",
  "reading_analysis",
  "conversation_final_evaluation",
]);

function envKey(operation: AIOperation) {
  return "OPENAI_MODEL_" + operation.toUpperCase();
}

function modelFor(routeClass: RouteClass) {
  return routeClass === "FAST" ? DEFAULT_FAST_MODEL : DEFAULT_COMPLEX_MODEL;
}

export function aiRoute(
  operation: AIOperation,
  input?: { complexity?: RouteClass },
): AIRoute {
  const configured = ROUTES[operation];
  const override = process.env[envKey(operation)];
  if (override) {
    return {
      model: override,
      maxOutputTokens: configured.maxOutputTokens,
      routeClass: configured.routeClass,
      reason: "ENV_OVERRIDE",
    };
  }

  if (input?.complexity && COMPLEXITY_ROUTABLE.has(operation)) {
    return {
      model: modelFor(input.complexity),
      maxOutputTokens: configured.maxOutputTokens,
      routeClass: input.complexity,
      reason:
        input.complexity === "FAST"
          ? "REQUEST_COMPLEXITY_FAST"
          : "REQUEST_COMPLEXITY_COMPLEX",
    };
  }

  return {
    model: modelFor(configured.routeClass),
    maxOutputTokens: configured.maxOutputTokens,
    routeClass: configured.routeClass,
    reason: configured.routeClass === "FAST" ? "STATIC_FAST" : "STATIC_COMPLEX",
  };
}

export function writingEvaluationComplexity(input: {
  draftChars: number;
  level: string;
  targetCount: number;
}) {
  const advanced = input.level === "C1" || input.level === "C2";
  return input.draftChars <= 900 && !advanced && input.targetCount <= 6
    ? ("FAST" as const)
    : ("COMPLEX" as const);
}

export function conversationFinalComplexity(input: {
  messageCount: number;
  level: string;
  targetCount: number;
}) {
  const advanced = input.level === "C1" || input.level === "C2";
  return input.messageCount <= 10 && !advanced && input.targetCount <= 6
    ? ("FAST" as const)
    : ("COMPLEX" as const);
}

export function isAIOperation(value: string): value is AIOperation {
  return Object.prototype.hasOwnProperty.call(ROUTES, value);
}

export const AI_OPERATION_BUDGETS = Object.fromEntries(
  Object.entries(ROUTES).map(([operation, route]) => [
    operation,
    {
      ...route,
      model: modelFor(route.routeClass),
      reason: route.routeClass === "FAST" ? "STATIC_FAST" : "STATIC_COMPLEX",
    },
  ]),
) as Record<AIOperation, AIRoute>;
