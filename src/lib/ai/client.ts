import OpenAI from "openai";

let client: OpenAI | undefined;
export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  return (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}
export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
