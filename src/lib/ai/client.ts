import OpenAI from "openai";

export const AI_PROVIDER = process.env.AI_PROVIDER ?? "openai";
export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
export const AI_MAX_RETRIES = Math.max(
  0,
  Number(process.env.OPENAI_MAX_RETRIES ?? "2") || 2,
);
export const AI_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.OPENAI_TIMEOUT_MS ?? "90000") || 90_000,
);

let client: OpenAI | undefined;

export function getOpenAI() {
  if (AI_PROVIDER !== "openai") {
    throw new Error(
      "Unsupported AI_PROVIDER: " +
        AI_PROVIDER +
        ". Configure a provider adapter before switching providers.",
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return (client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: AI_MAX_RETRIES,
    timeout: AI_TIMEOUT_MS,
  }));
}
