import { createHash } from "node:crypto";
import { AI_MAX_RETRIES, AI_TIMEOUT_MS } from "../client";
import { createAIUsageRecorder, type SafeAIMetadata } from "../usage-recorder";
import type { AIOperation } from "../routing";

export type DecisionPredicateQuestion = {
  type: "predicate";
  name: string;
  instructions: string;
};

export type DecisionChoiceQuestion = {
  type: "choice";
  name: string;
  instructions: string;
  choices: Array<{ value: string | boolean; description?: string }>;
};

export type DecisionScoreQuestion = {
  type: "score";
  name: string;
  instructions: string;
  levels: Array<{ label: string; description?: string }>;
};

export type DecisionQuestion =
  | DecisionPredicateQuestion
  | DecisionChoiceQuestion
  | DecisionScoreQuestion;

export type DecisionPredicateAnswer = {
  type: "predicate";
  name: string | null;
  probability: number;
};

export type DecisionChoiceAnswer = {
  type: "choice";
  name: string | null;
  choice: string | boolean;
  confidence: number;
  probabilities: Array<{ value: string | boolean; probability: number }>;
};

export type DecisionScoreAnswer = {
  type: "score";
  name: string | null;
  score: number;
  confidence: number;
  probabilities: Array<{ label: string; value: number; probability: number }>;
};

export type DecisionRefusalAnswer = {
  type: "refusal";
  name: string | null;
};

export type DecisionAnswer =
  | DecisionPredicateAnswer
  | DecisionChoiceAnswer
  | DecisionScoreAnswer
  | DecisionRefusalAnswer;

export type NativeDecisionResponse = {
  model: string;
  answers: DecisionAnswer[];
  usage?: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    compute_units?: number | null;
    input_tokens_details?: {
      cached_tokens?: number | null;
      cache_write_tokens?: number | null;
    } | null;
    output_tokens_details?: {
      reasoning_tokens?: number | null;
    } | null;
  } | null;
};

export const DECISIONS_MODEL =
  process.env.OPENAI_DECISIONS_MODEL ??
  process.env.OPENAI_FAST_MODEL ??
  "gpt-6-luna";

export function decisionsSafetyIdentifier(userId: string) {
  return createHash("sha256")
    .update("u-vocab:decisions:" + userId)
    .digest("hex")
    .slice(0, 64);
}

function questionCounts(questions: DecisionQuestion[]) {
  return {
    decisionPredicates: questions.filter((item) => item.type === "predicate").length,
    decisionChoices: questions.filter((item) => item.type === "choice").length,
    decisionScores: questions.filter((item) => item.type === "score").length,
  };
}

async function postDecision(body: {
  model: string;
  input: string;
  questions: DecisionQuestion[];
  safety_identifier: string;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/decisions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const requestId = response.headers.get("x-request-id");
      const payload = (await response.json().catch(() => null)) as
        | NativeDecisionResponse
        | { error?: { message?: string } }
        | null;

      if (!response.ok) {
        const error = new Error(
          (payload && "error" in payload && payload.error?.message) ||
            "OpenAI Decisions request failed with HTTP " + response.status,
        ) as Error & { status?: number; request_id?: string | null };
        error.status = response.status;
        error.request_id = requestId;
        throw error;
      }
      if (!payload || !("answers" in payload) || !Array.isArray(payload.answers)) {
        throw new Error("OpenAI Decisions returned an invalid response.");
      }
      return {
        response: payload,
        requestId,
        retryCount: attempt,
      };
    } catch (error) {
      lastError = error;
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: unknown }).status)
          : null;
      const retryable =
        attempt < AI_MAX_RETRIES &&
        (status === null || status === 408 || status === 429 || status >= 500);
      if (!retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Decisions request failed.");
}

export async function runNativeDecision(input: {
  userId: string;
  userCourseId?: string | null;
  operation: AIOperation | string;
  evidence: string | object;
  questions: DecisionQuestion[];
  metadata?: SafeAIMetadata;
}) {
  const recorder = createAIUsageRecorder({
    userId: input.userId,
    userCourseId: input.userCourseId,
    operation: input.operation,
    model: DECISIONS_MODEL,
    metadata: {
      endpoint: "decisions",
      decisionQuestionCount: input.questions.length,
      ...questionCounts(input.questions),
      ...input.metadata,
    },
  });

  try {
    const { response, requestId, retryCount } = await postDecision({
      model: DECISIONS_MODEL,
      input:
        typeof input.evidence === "string"
          ? input.evidence
          : JSON.stringify(input.evidence),
      questions: input.questions,
      safety_identifier: decisionsSafetyIdentifier(input.userId),
    });
    await recorder.success(
      { usage: response.usage, id: requestId },
      {
        decisionComputeUnits: response.usage?.compute_units ?? null,
        decisionRefusals: response.answers.filter((answer) => answer.type === "refusal").length,
        retryCount,
      },
    );
    return {
      status: "ok" as const,
      response,
      answers: answerMap(response.answers),
      retryCount,
    };
  } catch (error) {
    await recorder.failure(error);
    return {
      status: "error" as const,
      error: error instanceof Error ? error.message : "Decisions request failed.",
    };
  }
}

export function answerMap(answers: DecisionAnswer[]) {
  return new Map(
    answers
      .filter((answer): answer is Exclude<DecisionAnswer, DecisionRefusalAnswer> =>
        answer.type !== "refusal" && Boolean(answer.name),
      )
      .map((answer) => [answer.name as string, answer]),
  );
}

export function predicateProbability(
  answers: Map<string, Exclude<DecisionAnswer, DecisionRefusalAnswer>>,
  name: string,
) {
  const answer = answers.get(name);
  return answer?.type === "predicate" ? answer.probability : null;
}

export function choiceAnswer(
  answers: Map<string, Exclude<DecisionAnswer, DecisionRefusalAnswer>>,
  name: string,
) {
  const answer = answers.get(name);
  return answer?.type === "choice" ? answer : null;
}

export function scoreAnswer(
  answers: Map<string, Exclude<DecisionAnswer, DecisionRefusalAnswer>>,
  name: string,
) {
  const answer = answers.get(name);
  return answer?.type === "score" ? answer : null;
}

export const FIVE_LEVEL_SCORE = [
  { label: "VERY_LOW", description: "Very weak evidence or usefulness." },
  { label: "LOW", description: "Weak evidence or usefulness." },
  { label: "MEDIUM", description: "Moderate evidence or usefulness." },
  { label: "HIGH", description: "Strong evidence or usefulness." },
  { label: "VERY_HIGH", description: "Very strong evidence or usefulness." },
] as const;

export function normalizedScore(answer: DecisionScoreAnswer | null) {
  if (!answer) return null;
  const probabilities = answer.probabilities ?? [];
  if (probabilities.length) {
    const maxValue = Math.max(...probabilities.map((item) => item.value), 1);
    const minValue = Math.min(...probabilities.map((item) => item.value), 0);
    if (maxValue > minValue) {
      const expected = probabilities.reduce(
        (sum, item) => sum + item.value * item.probability,
        0,
      );
      return Math.max(0, Math.min(1, (expected - minValue) / (maxValue - minValue)));
    }
  }
  return Math.max(0, Math.min(1, answer.score / 4));
}
